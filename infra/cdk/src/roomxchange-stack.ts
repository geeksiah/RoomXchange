import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Aws,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib";
import { RestApi, LambdaIntegration, Cors, CognitoUserPoolsAuthorizer, AuthorizationType } from "aws-cdk-lib/aws-apigateway";
import { CfnApi, CfnIntegration, CfnRoute, CfnStage } from "aws-cdk-lib/aws-apigatewayv2";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Bucket, BucketEncryption, HttpMethods, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Distribution, ViewerProtocolPolicy, AllowedMethods, CachePolicy, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { OpenNextSite } from "./constructs/open-next-site.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class RoomXchangeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repoRoot = path.resolve(__dirname, "../../..");
    const stage = process.env.ROOMXCHANGE_STAGE ?? "dev";
    const tableName = stage === "prod" ? "RoomXchange-prod" : `RoomXchange-${stage}`;
    const backendOnly = /^(1|true|yes)$/i.test(process.env.ROOMXCHANGE_BACKEND_ONLY ?? "");
    const domain = process.env.ROOMXCHANGE_DOMAIN?.trim();
    const configuredWebUrl = process.env.ROOMXCHANGE_WEB_URL?.trim();
    const webAppUrl = configuredWebUrl || (domain ? `https://${domain}` : "http://localhost:3000");
    const paystackSecret = process.env.ROOMXCHANGE_PAYSTACK_SECRET_KEY ?? "replace-me";
    const paystackPlanCode = process.env.ROOMXCHANGE_PAYSTACK_PLAN_CODE ?? "replace-me";
    const adminWebEmail = process.env.ADMIN_WEB_EMAIL ?? "admin@roomxchange.dev";
    const adminWebPhone = process.env.ADMIN_WEB_PHONE ?? "+233240000001";
    const adminWebPassword = process.env.ADMIN_WEB_PASSWORD ?? "Admin@12345";
    const arkeselApiKey = process.env.ARKESEL_API_KEY ?? process.env.ROOMXCHANGE_ARKESEL_API_KEY ?? "";
    const arkeselSenderId = process.env.ARKESEL_SENDER_ID ?? process.env.ROOMXCHANGE_ARKESEL_SENDER_ID ?? "eventpeepo";
    const arkeselSmsApiUrl =
      process.env.ARKESEL_SMS_API_URL ??
      process.env.ROOMXCHANGE_ARKESEL_SMS_API_URL ??
      "https://sms.arkesel.com/api/v2/sms/send";
    const otpSmsTemplate = process.env.OTP_SMS_TEMPLATE ?? "Your RoomXchange verification code is {{code}}";

    const table = new Table(this, "RoomXchangeTable", {
      tableName,
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

    table.addGlobalSecondaryIndex({
      indexName: "GSI3",
      partitionKey: { name: "GSI3PK", type: AttributeType.STRING },
      sortKey: { name: "GSI3SK", type: AttributeType.STRING }
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
      publicReadAccess: backendOnly,
      blockPublicAccess: backendOnly ? BlockPublicAccess.BLOCK_ACLS : BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN
    });

    const mediaOriginAccessIdentity = backendOnly ? null : new OriginAccessIdentity(this, "MediaOAI");
    if (mediaOriginAccessIdentity) {
      mediaBucket.grantRead(mediaOriginAccessIdentity);
    }

    const mediaDistribution = backendOnly
      ? null
      : new Distribution(this, "MediaDistribution", {
          defaultBehavior: {
            origin: new origins.S3Origin(mediaBucket, { originAccessIdentity: mediaOriginAccessIdentity! }),
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachePolicy: CachePolicy.CACHING_OPTIMIZED
          }
        });
    const mediaBaseUrl = backendOnly
      ? `https://${mediaBucket.bucketRegionalDomainName}`
      : `https://${mediaDistribution!.distributionDomainName}`;

    const defineAuthChallenge = this.createNodeFunction("DefineAuthChallengeFn", {
      entry: path.join(repoRoot, "backend/src/cognito-define-auth.ts")
    });

    const createAuthChallenge = this.createNodeFunction("CreateAuthChallengeFn", {
      entry: path.join(repoRoot, "backend/src/cognito-create-auth.ts"),
      environment: {
        ARKESEL_API_KEY: arkeselApiKey,
        ARKESEL_SENDER_ID: arkeselSenderId,
        ARKESEL_SMS_API_URL: arkeselSmsApiUrl,
        OTP_SMS_TEMPLATE: otpSmsTemplate
      }
    });

    const verifyAuthChallenge = this.createNodeFunction("VerifyAuthChallengeFn", {
      entry: path.join(repoRoot, "backend/src/cognito-verify-auth.ts")
    });

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
        custom: true,
        userPassword: true,
        adminUserPassword: true
      }
    });

    const commonEnvironment = {
      ROOMXCHANGE_STAGE: stage,
      TABLE_NAME: table.tableName,
      MEDIA_BUCKET_NAME: mediaBucket.bucketName,
      MEDIA_CDN_URL: mediaBaseUrl,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      WEB_APP_URL: webAppUrl,
      PAYSTACK_SECRET_KEY: paystackSecret,
      PAYSTACK_PLAN_CODE: paystackPlanCode,
      ADMIN_WEB_EMAIL: adminWebEmail,
      ADMIN_WEB_PHONE: adminWebPhone,
      ADMIN_WEB_PASSWORD: adminWebPassword
    };

    const apiHandler = this.createNodeFunction("ApiHandlerFn", {
      entry: path.join(repoRoot, "backend/src/handlers/api.ts"),
      environment: commonEnvironment
    });

    const websocketConnectHandler = this.createNodeFunction("WebsocketConnectHandlerFn", {
      entry: path.join(repoRoot, "backend/src/handlers/ws.ts"),
      handler: "connectHandler",
      environment: commonEnvironment
    });

    const websocketDisconnectHandler = this.createNodeFunction("WebsocketDisconnectHandlerFn", {
      entry: path.join(repoRoot, "backend/src/handlers/ws.ts"),
      handler: "disconnectHandler",
      environment: commonEnvironment
    });

    const websocketDefaultHandler = this.createNodeFunction("WebsocketDefaultHandlerFn", {
      entry: path.join(repoRoot, "backend/src/handlers/ws.ts"),
      handler: "defaultHandler",
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
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:ListUsers"
        ],
        resources: [userPool.userPoolArn]
      })
    );

    websocketConnectHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ["cognito-idp:GetUser"],
        resources: ["*"]
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
    table.grantReadWriteData(websocketConnectHandler);
    table.grantReadWriteData(websocketDisconnectHandler);
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
    api.root.addResource("app").addResource("notification-settings").addMethod("GET", integration);

    const listings = api.root.addResource("listings");
    listings.addResource("feed").addMethod("GET", integration);
    const listingById = listings.addResource("{id}");
    listingById.addMethod("GET", integration);
    listings.addResource("user").addResource("{userId}").addMethod("GET", integration);

    const subscription = api.root.addResource("subscription");
    subscription.addResource("verify").addMethod("POST", integration);

    const admin = api.root.addResource("admin");
    admin.addResource("auth").addResource("login").addMethod("POST", integration);

    const authenticatedProxy = api.root.addResource("{proxy+}");
    authenticatedProxy.addMethod("ANY", integration, authMethodOptions);

    const websocketApi = new CfnApi(this, "RoomXchangeWebsocketApi", {
      name: "RoomXchangeRealtime",
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action"
    });

    const websocketConnectIntegration = this.createWebsocketIntegration("WebsocketConnectIntegration", websocketApi.ref, websocketConnectHandler);
    const websocketDisconnectIntegration = this.createWebsocketIntegration("WebsocketDisconnectIntegration", websocketApi.ref, websocketDisconnectHandler);
    const websocketDefaultIntegration = this.createWebsocketIntegration("WebsocketDefaultIntegration", websocketApi.ref, websocketDefaultHandler);

    new CfnRoute(this, "WebsocketConnectRoute", {
      apiId: websocketApi.ref,
      routeKey: "$connect",
      authorizationType: "NONE",
      target: `integrations/${websocketConnectIntegration.ref}`
    });

    new CfnRoute(this, "WebsocketDisconnectRoute", {
      apiId: websocketApi.ref,
      routeKey: "$disconnect",
      authorizationType: "NONE",
      target: `integrations/${websocketDisconnectIntegration.ref}`
    });

    new CfnRoute(this, "WebsocketDefaultRoute", {
      apiId: websocketApi.ref,
      routeKey: "$default",
      authorizationType: "NONE",
      target: `integrations/${websocketDefaultIntegration.ref}`
    });

    new CfnStage(this, "WebsocketStage", {
      apiId: websocketApi.ref,
      stageName: stage,
      autoDeploy: true
    });

    const websocketManagementEndpoint = `https://${websocketApi.ref}.execute-api.${this.region}.${Aws.URL_SUFFIX}/${stage}`;
    const websocketPublicUrl = `wss://${websocketApi.ref}.execute-api.${this.region}.${Aws.URL_SUFFIX}/${stage}`;
    apiHandler.addEnvironment("WEBSOCKET_API_ENDPOINT", websocketManagementEndpoint);
    apiHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ["execute-api:ManageConnections"],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${websocketApi.ref}/*`]
      })
    );

    this.grantWebsocketInvoke(websocketApi.ref, websocketConnectHandler, "$connect");
    this.grantWebsocketInvoke(websocketApi.ref, websocketDisconnectHandler, "$disconnect");
    this.grantWebsocketInvoke(websocketApi.ref, websocketDefaultHandler, "$default");

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

    const webSite = backendOnly
      ? null
      : new OpenNextSite(this, "WebSite", {
          buildPath: path.join(repoRoot, "apps/web/.open-next"),
          environment: {
            NEXT_PUBLIC_ROOMXCHANGE_API_URL: api.url,
            NEXT_PUBLIC_ROOMXCHANGE_WEB_URL: webAppUrl,
            NEXT_PUBLIC_ROOMXCHANGE_MEDIA_URL: mediaBaseUrl,
            NEXT_PUBLIC_ROOMXCHANGE_SOCKET_URL: websocketPublicUrl
          }
        });

    new CfnOutput(this, "ApiUrl", { value: api.url });
    new CfnOutput(this, "TableName", { value: table.tableName });
    new CfnOutput(this, "MediaBucketName", { value: mediaBucket.bucketName });
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "BackendOnlyMode", { value: backendOnly ? "true" : "false" });
    new CfnOutput(this, "MediaUrl", { value: mediaBaseUrl });
    new CfnOutput(this, "WebUrl", {
      value: webSite ? `https://${webSite.distribution.distributionDomainName}` : "BACKEND_ONLY_DEPLOYMENT"
    });
    new CfnOutput(this, "SocketUrl", { value: websocketPublicUrl });
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

  private createWebsocketIntegration(id: string, apiId: string, handler: NodejsFunction) {
    return new CfnIntegration(this, id, {
      apiId,
      integrationMethod: "POST",
      integrationType: "AWS_PROXY",
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${handler.functionArn}/invocations`
    });
  }

  private grantWebsocketInvoke(apiId: string, handler: NodejsFunction, routeKey: string) {
    handler.addPermission(`${handler.node.id}${routeKey.replace(/\W/g, "")}InvokePermission`, {
      principal: new ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${apiId}/*/${routeKey}`
    });
  }
}
