import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { otpRequestSchema, otpVerifySchema, type OtpRequestInput, type OtpVerifyInput } from "@roomxchange/contracts";
import { theme } from "../theme";
import { useSession } from "../session-provider";

export function AuthPanel({ title = "Verify your phone" }: { title?: string }) {
  const { api, setSession } = useSession();
  const [challenge, setChallenge] = useState<{ phone: string; session: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const requestForm = useForm<OtpRequestInput>({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: { phone: "", name: "", email: "" }
  });

  const verifyForm = useForm<OtpVerifyInput>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { phone: "", session: "", code: "", name: "", email: "" }
  });

  const submitRequest = requestForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      const response = await api.requestOtp(values);
      setChallenge({ phone: values.phone, session: response.session });
      verifyForm.reset({
        ...values,
        code: "",
        session: response.session,
        phone: values.phone
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to send OTP.");
    } finally {
      setPending(false);
    }
  });

  const submitVerify = verifyForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      const nextSession = await api.verifyOtp(values);
      startTransition(() => {
        void setSession(nextSession);
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to verify OTP.");
    } finally {
      setPending(false);
    }
  });

  return (
    <View
      style={{
        backgroundColor: "rgba(255,253,250,0.95)",
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 28,
        padding: 22,
        gap: 14
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", color: theme.colors.text }}>{title}</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        RoomXchange uses phone OTP for both mobile and web so your subscription status stays in sync.
      </Text>

      {!challenge ? (
        <View style={{ gap: 12 }}>
          <Controller
            control={requestForm.control}
            name="phone"
            render={({ field }) => (
              <TextInput
                placeholder="+1 555 123 4567"
                placeholderTextColor={theme.colors.textMuted}
                style={fieldStyle}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={requestForm.control}
            name="name"
            render={({ field }) => (
              <TextInput
                placeholder="Full name"
                placeholderTextColor={theme.colors.textMuted}
                style={fieldStyle}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={requestForm.control}
            name="email"
            render={({ field }) => (
              <TextInput
                placeholder="Email for receipts"
                placeholderTextColor={theme.colors.textMuted}
                style={fieldStyle}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
          <Pressable style={buttonStyle} onPress={() => void submitRequest()} disabled={pending}>
            <Text style={buttonLabelStyle}>{pending ? "Sending..." : "Send OTP"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.colors.textMuted }}>We sent a code to {challenge.phone}. Finish verification to continue.</Text>
          <Controller
            control={verifyForm.control}
            name="code"
            render={({ field }) => (
              <TextInput
                placeholder="123456"
                placeholderTextColor={theme.colors.textMuted}
                style={fieldStyle}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
          <Pressable style={buttonStyle} onPress={() => void submitVerify()} disabled={pending}>
            <Text style={buttonLabelStyle}>{pending ? "Verifying..." : "Verify OTP"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const fieldStyle = {
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: theme.colors.text,
  backgroundColor: "white"
} as const;

const buttonStyle = {
  backgroundColor: theme.colors.accent,
  paddingVertical: 16,
  borderRadius: 999,
  alignItems: "center"
} as const;

const buttonLabelStyle = {
  color: "white",
  fontWeight: "700"
} as const;
