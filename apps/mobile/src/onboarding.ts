import * as SecureStore from "expo-secure-store";

const onboardingKey = "roomxchange.mobile.onboarding-complete";

export async function getOnboardingComplete() {
  const value = await SecureStore.getItemAsync(onboardingKey);
  return value === "true";
}

export function setOnboardingComplete(value: boolean) {
  if (value) {
    return SecureStore.setItemAsync(onboardingKey, "true");
  }

  return SecureStore.deleteItemAsync(onboardingKey);
}
