import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { App } from "aws-cdk-lib";
import { RoomXchangeStack } from "../src/roomxchange-stack.js";

const require = createRequire(import.meta.url);

if (process.platform === "win32") {
  const awsCdkPackageRoot = path.dirname(require.resolve("aws-cdk-lib/package.json"));
  const packageManagerModule = require(path.join(awsCdkPackageRoot, "aws-lambda-nodejs", "lib", "package-manager.js"));
  const originalRunBinCommand = packageManagerModule.PackageManager.prototype.runBinCommand;

  packageManagerModule.PackageManager.prototype.runBinCommand = function runBinCommandPatched(bin: string) {
    if (this.lockFile === "package-lock.json") {
      const localNodeEntrypoint = path.join(process.cwd(), "node_modules", bin, "bin", bin);
      if (fs.existsSync(localNodeEntrypoint)) {
        return [process.execPath, localNodeEntrypoint];
      }
    }

    return originalRunBinCommand.call(this, bin);
  };
}

const app = new App();

new RoomXchangeStack(app, "RoomXchangeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1"
  }
});
