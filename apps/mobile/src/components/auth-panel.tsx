import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, TextInput, View } from "react-native";
import { otpRequestSchema, otpVerifySchema, type OtpRequestInput, type OtpVerifyInput } from "@roomxchange/contracts";
import { sanitizePhone } from "@roomxchange/shared";
import { useSession } from "../session-provider";
import { ScaleButton } from "./scale-button";

export function AuthPanel({ title, mode = "login" }: { title?: string; mode?: "login" | "signup" }) {
  const { api, setSession } = useSession();
  const [challenge, setChallenge] = useState<{ phone: string; session: string; name?: string; email?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestForm = useForm<OtpRequestInput>({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: { phone: "", name: "", email: "" }
  });

  const verifyForm = useForm<OtpVerifyInput>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { phone: "", session: "", code: "", name: "", email: "" }
  });

  const onRequestOtp = requestForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      const result = await api.requestOtp(values);
      const normalizedPhone = sanitizePhone(values.phone);
      setChallenge({ phone: normalizedPhone, session: result.session, name: values.name, email: values.email });
      verifyForm.reset({
        code: "",
        email: values.email,
        name: values.name,
        phone: normalizedPhone,
        session: result.session
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? "We couldn't send the code right now." : "We couldn't send the code right now.");
    } finally {
      setPending(false);
    }
  });

  const onVerifyOtp = verifyForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      const nextSession = await api.verifyOtp(values);
      startTransition(() => {
        void setSession(nextSession);
      });
    } catch (verifyError) {
      setError(verifyError instanceof Error ? "We couldn't verify that code right now." : "We couldn't verify that code right now.");
    } finally {
      setPending(false);
    }
  });

  const onUseDemoAccount = async () => {
    try {
      setDemoPending(true);
      setError(null);
      const result = await api.bootstrapDemo({ signIn: true });
      if (!result.session) {
        throw new Error("Demo account unavailable");
      }
      startTransition(() => {
        void setSession(result.session);
      });
    } catch (demoError) {
      setError(demoError instanceof Error ? "We couldn't open the demo account right now." : "We couldn't open the demo account right now.");
    } finally {
      setDemoPending(false);
    }
  };

  return (
    <View className="rounded-3xl bg-white p-5">
      {title ? <Text className="font-jakarta-bold text-2xl text-rx-text">{title}</Text> : null}

      {!challenge ? (
        <View className={`${title ? "mt-5" : ""} gap-3`}>
          {mode === "signup" ? (
            <>
              <Text className="font-jakarta-bold text-sm text-rx-text">Full name</Text>
              <Controller control={requestForm.control} name="name" render={({ field }) => <Input placeholder="Ama Ofori" returnKeyType="next" value={field.value ?? ""} onChangeText={field.onChange} />} />
              <Text className="font-jakarta-bold text-sm text-rx-text">Email</Text>
              <Controller control={requestForm.control} name="email" render={({ field }) => <Input placeholder="ama@example.com" keyboardType="email-address" returnKeyType="next" value={field.value ?? ""} onChangeText={field.onChange} />} />
            </>
          ) : null}
          <Text className="font-jakarta-bold text-sm text-rx-text">Phone number</Text>
          <Controller control={requestForm.control} name="phone" render={({ field }) => <Input placeholder="024 123 4567" keyboardType="phone-pad" returnKeyType="done" value={field.value} onChangeText={field.onChange} />} />
          {error ? <Text className="font-jakarta text-sm text-red-600">{error}</Text> : null}
          <ScaleButton onPress={() => void onRequestOtp()} className="mt-1 rounded-full bg-rx-accent py-4">
            <Text className="text-center font-jakarta-bold text-base text-white">
              {pending ? "Sending..." : mode === "signup" ? "Create account" : "Send OTP"}
            </Text>
          </ScaleButton>
          {__DEV__ ? (
            <ScaleButton onPress={() => void onUseDemoAccount()} className="rounded-full border border-rx-border bg-rx-background py-4">
              <Text className="text-center font-jakarta-bold text-base text-rx-text">{demoPending ? "Preparing demo..." : "Use E2E test account"}</Text>
              <Text className="mt-1 text-center font-jakarta text-xs text-rx-muted">Seeds demo listings and signs in instantly</Text>
            </ScaleButton>
          ) : null}
        </View>
      ) : (
        <View className={`${title ? "mt-5" : ""} gap-3`}>
          <Text className="font-jakarta-bold text-sm text-rx-text">OTP code</Text>
          <Text className="font-jakarta text-sm text-rx-muted">Enter the code sent to {challenge.phone}.</Text>
          <Controller control={verifyForm.control} name="code" render={({ field }) => <Input placeholder="123456" keyboardType="number-pad" returnKeyType="done" value={field.value} onChangeText={field.onChange} />} />
          {error ? <Text className="font-jakarta text-sm text-red-600">{error}</Text> : null}
          <ScaleButton onPress={() => void onVerifyOtp()} className="mt-1 rounded-full bg-rx-accent py-4">
            <Text className="text-center font-jakarta-bold text-base text-white">{pending ? "Verifying..." : mode === "signup" ? "Verify and continue" : "Verify OTP"}</Text>
          </ScaleButton>
          {__DEV__ ? (
            <ScaleButton onPress={() => void onUseDemoAccount()} className="rounded-full border border-rx-border bg-rx-background py-4">
              <Text className="text-center font-jakarta-bold text-base text-rx-text">{demoPending ? "Preparing demo..." : "Use E2E test account"}</Text>
              <Text className="mt-1 text-center font-jakarta text-xs text-rx-muted">Skip OTP and open the seeded account</Text>
            </ScaleButton>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Input({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  returnKeyType
}: {
  placeholder: string;
  value?: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad" | "email-address";
  returnKeyType?: "done" | "next";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      returnKeyType={returnKeyType}
      placeholder={placeholder}
      placeholderTextColor="#6B7280"
      className="rounded-2xl border border-rx-border bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
    />
  );
}
