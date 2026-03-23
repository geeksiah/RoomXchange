import path from "node:path";
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib";
import { RestApi, LambdaIntegration, Cors, CognitoUserPoolsAuthorizer, AuthorizationType } from "aws-cdk-lib/aws-apigateway";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Bucket, BucketEncryption, HttpMethods, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Distribution, ViewerProtocolPolicy, AllowedMethods, CachePolicy, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { OpenNextSite } from "./constructs/open-next-site.js";

export class RoomXchangeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repoRoot = path.resolve(__dirname, "../../../..");
    const stage = process.env.ROOMXCHANGE_STAGE ?? "dev";
    const domain = process.env.ROOMXCHANGE_DOMAIN?.trim();
    const configuredWebUrl = process.env.ROOMXCHANGE_WEB_URL?.trim();
    const webAppUrl = configuredWebUrl || (domain ? `https://${domain}` : "http://localhost:3000");
    const paystackSecret = process.env.ROOMXCHANGE_PAYSTACK_SECRET_KEY ?? "replace-me";
    const paystackPlanCode = process.env.ROOMXCHANGE_PAYSTACK_PLAN_CODE ?? "replace-me";

    const table = new Table(this, "RoomXchangeTable", {
      tableName: "RoomXchange",
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: AttributeType.STRING }
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: AttributeType.STRING }
    });

    const mediaBucket = new Bucket(this, "MediaBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.HEAD],
          exposedHeaders: ["ETag"]
        }
      ],
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN
    });

    const mediaOriginAccessIdentity = new OriginAccessIdentity(this, "MediaOAI");
    mediaBucket.grantRead(mediaOriginAccessIdentity);

    const mediaDistribution = new Distribution(this, "MediaDistribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(mediaBucket, { originAccessIdentity: mediaOriginAccessIdentity }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED
      }
    });

    const defineAuthChallenge = this.createNodeFunction("DefineAuthChallengeFn", {
      entry: path.join(repoRoot, "backend/src/cognito-define-auth.ts")
    });

    const createAuthChallenge = this.createNodeFunction("CreateAuthChallengeFn", {
      entry: path.join(repoRoot, "backend/src/cognito-create-auth.ts")
    });

    const verifyAuthChallenge = this.createNodeFunction("VerifyAuthChallengeFn", {
      entry: path.join(repoRoot, "backend/src/cognito-verify-auth.ts")
    });

    createAuthChallenge.addToRolePolicy(
      new PolicyStatement({
        actions: ["sns:Publish"],
        resources: ["*"]
      })
    );

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInAliases: {
        phone: true
      },
      autoVerify: {
        phone: true
      },
      lambdaTriggers: {
        defineAuthChallenge,
        createAuthChallenge,
        verifyAuthChallengeResponse: verifyAuthChallenge
      }
    });

    const userPoolClient = new UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: {
        custom: true
      }
    });

    const commonEnvironment = {
      ROOMXCHANGE_STAGE: stage,
      TABLE_NAME: table.tableName,
      MEDIA_BUCKET_NAME: mediaBucket.bucketName,
      MEDIA_CDN_URL: `https://${mediaDistribution.distributionDomainName}`,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      WEB_APP_URL: webAppUrl,
      PAYSTACK_SECRET_KEY: paystackSecret,
      PAYSTACK_PLAN_CODE: paystackPlanCode
    };

    const apiHandler = this.createNodeFunction("ApiHandlerFn", {
      entry: path.join(repoRoot, "backend/src/handlers/api.ts"),
      environment: commonEnvironment
    });

    apiHandler.addToRolePolicy(
      new PolicyStatement({
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminRespondToAuthChallenge",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminUpdateUserAttributes"
        ],
        resources: [userPool.userPoolArn]
      })
    );

    const subscriptionReconciliation = this.createNodeFunction("SubscriptionReconciliationFn", {
      entry: path.join(repoRoot, "backend/src/jobs.ts"),
      handler: "subscriptionReconciliationHandler",
      environment: commonEnvironment
    });

    const staleUploadCleanup = this.createNodeFunction("StaleUploadCleanupFn", {
      entry: path.join(repoRoot, "backend/src/jobs.ts"),
      handler: "staleUploadCleanupHandler",
      environment: commonEnvironment
    });

    const operationalAudit = this.createNodeFunction("OperationalAuditFn", {
      entry: path.join(repoRoot, "backend/src/jobs.ts"),
      handler: "operationalAuditHandler",
      environment: commonEnvironment
    });

    table.grantReadWriteData(apiHandler);
    table.grantReadWriteData(subscriptionReconciliation);
    table.grantReadWriteData(staleUploadCleanup);
    mediaBucket.grantReadWrite(apiHandler);
    mediaBucket.grantReadWrite(staleUploadCleanup);

    const api = new RestApi(this, "RoomXchangeApi", {
      restApiName: "RoomXchangeApi",
      deployOptions: {
        stageName: stage,
        throttlingBurstLimit: 50,
        throttlingRateLimit: 100
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowHeaders: ["authorization", "content-type", "x-paystack-signature"],
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
      }
    });

    const authorizer = new CognitoUserPoolsAuthorizer(this, "ApiAuthorizer", {
      cognitoUserPools: [userPool]
    });

    const integration = new LambdaIntegration(apiHandler);
    const authMethodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer
    };

    const auth = api.root.addResource("auth");
    auth.addResource("request-otp").addMethod("POST", integration);
    auth.addResource("verify-otp").addMethod("POST", integration);
    const me = auth.addResource("me");
    me.addMethod("GET", integration, authMethodOptions);
    me.addMethod("PATCH", integration, authMethodOptions);

    const uploads = api.root.addResource("uploads");
    uploads.addResource("presign").addMethod("POST", integration, authMethodOptions);

    const listings = api.root.addResource("listings");
    listings.addResource("create").addMethod("POST", integration, authMethodOptions);
    listings.addResource("feed").addMethod("GET", integration);
    const listingById = listings.addResource("{id}");
    listingById.addMethod("GET", integration);
    listingById.addMethod("PATCH", integration, authMethodOptions);
    listingById.addMethod("DELETE", integration, authMethodOptions);
    listings.addResource("user").addResource("{userId}").addMethod("GET", integration);

    const subscription = api.root.addResource("subscription");
    subscription.addResource("status").addMethod("GET", integration, authMethodOptions);
    subscription.addResource("checkout-link").addMethod("POST", integration, authMethodOptions);
    subscription.addResource("verify").addMethod("POST", integration);

    const reports = api.root.addResource("reports");
    reports.addResource("create").addMethod("POST", integration, authMethodOptions);

    const admin = api.root.addResource("admin");
    const adminReports = admin.addResource("reports");
    adminReports.addMethod("GET", integration, authMethodOptions);
    adminReports.addResource("{id}").addMethod("PATCH", integration, authMethodOptions);

    new Rule(this, "SubscriptionReconciliationSchedule", {
      schedule: Schedule.rate(Duration.hours(6)),
      targets: [new LambdaFunction(subscriptionReconciliation)]
    });

    new Rule(this, "StaleUploadCleanupSchedule", {
      schedule: Schedule.rate(Duration.hours(1)),
      targets: [new LambdaFunction(staleUploadCleanup)]
    });

    new Rule(this, "OperationalAuditSchedule", {
      schedule: Schedule.rate(Duration.days(1)),
      targets: [new LambdaFunction(operationalAudit)]
    });

    const webSite = new OpenNextSite(this, "WebSite", {
      buildPath: path.join(repoRoot, "apps/web/.open-next"),
      environment: {
        NEXT_PUBLIC_ROOMXCHANGE_API_URL: api.url,
        NEXT_PUBLIC_ROOMXCHANGE_WEB_URL: webAppUrl,
        NEXT_PUBLIC_ROOMXCHANGE_MEDIA_URL: `https://${mediaDistribution.distributionDomainName}`
      }
    });

    new CfnOutput(this, "ApiUrl", { value: api.url });
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "MediaUrl", { value: `https://${mediaDistribution.distributionDomainName}` });
    new CfnOutput(this, "WebUrl", { value: `https://${webSite.distribution.distributionDomainName}` });
  }

  private createNodeFunction(
    id: string,
    {
      entry,
      handler = "handler",
      environment = {}
    }: {
      entry: string;
      handler?: string;
      environment?: Record<string, string>;
    }
  ) {
    return new NodejsFunction(this, id, {
      entry,
      handler,
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment
    });
  }
}
