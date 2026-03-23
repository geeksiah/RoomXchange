import type { DefineAuthChallengeTriggerEvent } from "aws-lambda";

export async function handler(event: DefineAuthChallengeTriggerEvent) {
  const lastChallenge = event.request.session.at(-1);

  if (lastChallenge?.challengeName === "CUSTOM_CHALLENGE" && lastChallenge.challengeResult) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  if (event.request.session.length >= 3) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  event.response.challengeName = "CUSTOM_CHALLENGE";
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  return event;
}
