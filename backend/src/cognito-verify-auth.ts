import type { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";

export async function handler(event: VerifyAuthChallengeResponseTriggerEvent) {
  event.response.answerCorrect = event.request.privateChallengeParameters.answer === event.request.challengeAnswer;
  return event;
}
