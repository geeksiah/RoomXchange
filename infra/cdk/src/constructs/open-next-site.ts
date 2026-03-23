import path from "node:path";
import { Duration } from "aws-cdk-lib";
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy, AllowedMethods, CachePolicy, OriginRequestPolicy } from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket, BucketEncryption, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Function, FunctionUrlAuthType, Runtime, Architecture, Code } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class OpenNextSite extends Construct {
  readonly distribution: Distribution;

  constructor(
    scope: Construct,
    id: string,
    {
      buildPath,
      environment = {}
    }: {
      buildPath: string;
      environment?: Record<string, string>;
    }
  ) {
    super(scope, id);

    const assetsBucket = new Bucket(this, "AssetsBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    const originAccessIdentity = new OriginAccessIdentity(this, "AssetsOAI");
    assetsBucket.grantRead(originAccessIdentity);

    new BucketDeployment(this, "DeployStaticAssets", {
      sources: [Source.asset(path.join(buildPath, "assets"))],
      destinationBucket: assetsBucket
    });

    const serverFunction = new Function(this, "ServerFunction", {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: "index.handler",
      code: Code.fromAsset(path.join(buildPath, "server-function")),
      memorySize: 1536,
      timeout: Duration.seconds(30),
      environment
    });

    const serverFunctionUrl = serverFunction.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE
    });

    const imageFunction = new Function(this, "ImageFunction", {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: "index.handler",
      code: Code.fromAsset(path.join(buildPath, "image-optimization-function")),
      memorySize: 1024,
      timeout: Duration.seconds(20),
      environment
    });

    const imageFunctionUrl = imageFunction.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE
    });

    this.distribution = new Distribution(this, "WebDistribution", {
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(serverFunctionUrl),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
      },
      additionalBehaviors: {
        "_next/static/*": {
          origin: new origins.S3Origin(assetsBucket, { originAccessIdentity }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS
        },
        "assets/*": {
          origin: new origins.S3Origin(assetsBucket, { originAccessIdentity }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS
        },
        "_next/image*": {
          origin: new origins.FunctionUrlOrigin(imageFunctionUrl),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
        }
      }
    });
  }
}
