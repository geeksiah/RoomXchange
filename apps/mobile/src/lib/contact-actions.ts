import { Linking } from "react-native";
import { sanitizePhone } from "@roomxchange/shared";

function toDialablePhone(phone: string) {
  return sanitizePhone(phone).replace(/\s+/g, "");
}

export async function openPhoneCall(phone: string) {
  const dialable = toDialablePhone(phone);
  if (!dialable) {
    return;
  }

  await Linking.openURL(`tel:${dialable}`);
}

export async function openWhatsApp(phone: string) {
  const dialable = toDialablePhone(phone).replace(/^\+/, "");
  if (!dialable) {
    return;
  }

  await Linking.openURL(`https://wa.me/${dialable}`);
}
