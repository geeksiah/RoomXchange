import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SNSClient } from "@aws-sdk/client-sns";
import { env } from "./config.js";

const dynamo = new DynamoDBClient({ region: env.AWS_REGION });

export const db = DynamoDBDocumentClient.from(dynamo, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

export const cognito = new CognitoIdentityProviderClient({
  region: env.AWS_REGION
});

export const s3 = new S3Client({
  region: env.AWS_REGION
});

export const sns = new SNSClient({
  region: env.AWS_REGION
});
