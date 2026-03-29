import { env } from "./config.js";

function normalizeRecipient(phone: string) {
  return phone.replace(/^\+/, "");
}

export async function sendOtpSms(phoneNumber: string, code: string) {
  if (!env.ARKESEL_API_KEY) {
    throw new Error("Missing Arkesel configuration: ARKESEL_API_KEY");
  }

  const response = await fetch(env.ARKESEL_SMS_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": env.ARKESEL_API_KEY
    },
    body: JSON.stringify({
      sender: env.ARKESEL_SENDER_ID,
      message: env.OTP_SMS_TEMPLATE.replace("{{code}}", code),
      recipients: [normalizeRecipient(phoneNumber)]
    })
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    const detail = responseText.trim();
    throw new Error(
      detail ? `Arkesel SMS request failed with status ${response.status}: ${detail}` : `Arkesel SMS request failed with status ${response.status}`
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        code?: string;
        status?: string | number;
        message?: string;
      }
    | null;

  const resultCode = String(payload?.code ?? payload?.status ?? "");
  if (resultCode && resultCode !== "1000" && resultCode !== "success") {
    throw new Error(payload?.message ? `Arkesel rejected the SMS request: ${payload.message}` : "Arkesel rejected the SMS request.");
  }
}
