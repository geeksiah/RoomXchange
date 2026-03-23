import { PublishCommand } from "@aws-sdk/client-sns";
import type { CreateAuthChallengeTriggerEvent } from "aws-lambda";
import { sns } from "./aws.js";
import { env } from "./config.js";

function createCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function handler(event: CreateAuthChallengeTriggerEvent) {
  if (event.request.challengeName !== "CUSTOM_CHALLENGE") {
    return event;
  }

  const previousChallenge = event.request.session.at(-1);
  const code = previousChallenge?.challengeMetadata?.startsWith("CODE-")
    ? previousChallenge.challengeMetadata.replace("CODE-", "")
    : createCode();

  await sns.send(
    new PublishCommand({
      PhoneNumber: event.request.userAttributes.phone_number,
      Message: env.OTP_SMS_TEMPLATE.replace("{{code}}", code)
    })
  );

  event.response.publicChallengeParameters = {
    phone: event.request.userAttributes.phone_number
  };
  event.response.privateChallengeParameters = {
    answer: code
  };
  event.response.challengeMetadata = `CODE-${code}`;
  return event;
}
