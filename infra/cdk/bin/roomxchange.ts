import { App } from "aws-cdk-lib";
import { RoomXchangeStack } from "../src/roomxchange-stack.js";

const app = new App();

new RoomXchangeStack(app, "RoomXchangeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1"
  }
});
