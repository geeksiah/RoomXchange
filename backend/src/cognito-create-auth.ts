import type { CreateAuthChallengeTriggerEvent } from "aws-lambda";
import { sendOtpSms } from "./sms.js";

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

  await sendOtpSms(event.request.userAttributes.phone_number, code);

  event.response.publicChallengeParameters = {
    phone: event.request.userAttributes.phone_number
  };
  event.response.privateChallengeParameters = {
    answer: code
  };
  event.response.challengeMetadata = `CODE-${code}`;
  return event;
}
