import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import {
  authLoginSchema,
  authPasswordResetRequestSchema,
  authPasswordResetVerifySchema,
  authSignupRequestSchema,
  authSignupVerifySchema,
  type AuthLoginInput,
  type AuthPasswordResetRequestInput,
  type AuthPasswordResetVerifyInput,
  type AuthSignupRequestInput,
  type AuthSignupVerifyInput
} from "@roomxchange/contracts";
import { sanitizePhone } from "@roomxchange/shared/src/mobile";
import { logDeveloperError } from "../lib/dev-log";
import { useSession } from "../session-provider";
import { ScaleButton } from "./scale-button";

function getFriendlyLoginError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("api url is missing from this mobile build")) {
    return "This app build needs an update before sign in can work. Install the latest version and try again.";
  }

  if (message.includes("network error") || message.includes("network request failed")) {
    return "We couldn't reach RoomXchange right now. Check your internet connection and try again.";
  }

  if (message.includes("invalid")) {
    return "The email, phone number, or password is incorrect.";
  }

  if (message.includes("verify")) {
    return "Verify your phone number first, then sign in.";
  }

  return "We couldn't sign you in right now. Please try again.";
}

function getFriendlyOtpRequestError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("api url is missing from this mobile build")) {
    return "This app build needs an update before verification can work. Install the latest version and try again.";
  }

  if (message.includes("network error") || message.includes("network request failed")) {
    return "The app could not reach the RoomXchange API. Check your internet connection and try again.";
  }

  if (message.includes("already exists")) {
    return "An account with this phone or email already exists.";
  }

  if (message.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (message.includes("account not found")) {
    return "We couldn't find an account with that phone number or email.";
  }

  if (
    message.includes("password") ||
    message.includes("uppercase") ||
    message.includes("lowercase") ||
    message.includes("number") ||
    message.includes("symbol")
  ) {
    return "Choose a password with at least 6 characters.";
  }

  if (message.includes("validation failed")) {
    return "Check your details and try again.";
  }

  if (message.includes("phone")) {
    return "Check the phone number and try again.";
  }

  if (
    message.includes("arkesel") ||
    message.includes("sms") ||
    message.includes("status 401") ||
    message.includes("status 403") ||
    message.includes("status 400") ||
    message.includes("status 422") ||
    message.includes("internal server")
  ) {
    return "We couldn't send your code right now. Please try again shortly.";
  }

  return "We couldn't start verification right now. Please try again shortly.";
}

function getFriendlyOtpVerifyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid") || message.includes("expired")) {
    return "That code is invalid or expired. Request a new code and try again.";
  }

  if (message.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "We couldn't verify that code right now. Please try again.";
}

type AuthMode = "login" | "signup" | "forgot-password";

export function AuthPanel({ title, mode = "login" }: { title?: string; mode?: AuthMode }) {
  const { api, setSession } = useSession();
  const [challenge, setChallenge] = useState<{ identifier: string; phone?: string; session: string; password?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmIntent, setConfirmIntent] = useState<"signup" | "reset" | null>(null);

  const loginForm = useForm<AuthLoginInput>({
    resolver: zodResolver(authLoginSchema),
    defaultValues: { identifier: "", password: "" }
  });

  const signupRequestForm = useForm<AuthSignupRequestInput>({
    resolver: zodResolver(authSignupRequestSchema),
    defaultValues: { name: "", email: undefined, phone: "", password: "" }
  });

  const signupVerifyForm = useForm<AuthSignupVerifyInput>({
    resolver: zodResolver(authSignupVerifySchema),
    defaultValues: { phone: "", session: "", code: "" }
  });

  const resetRequestForm = useForm<AuthPasswordResetRequestInput>({
    resolver: zodResolver(authPasswordResetRequestSchema),
    defaultValues: { identifier: "" }
  });

  const resetVerifyForm = useForm<AuthPasswordResetVerifyInput>({
    resolver: zodResolver(authPasswordResetVerifySchema),
    defaultValues: { identifier: "", session: "", code: "", newPassword: "" }
  });

  const submitLabel = useMemo(() => {
    if (mode === "signup") {
      return challenge ? "Verify and continue" : "Create account";
    }
    if (mode === "forgot-password") {
      return challenge ? "Reset password" : "Send reset code";
    }
    return "Sign in";
  }, [challenge, mode]);

  const pendingLabel = useMemo(() => {
    if (mode === "login") {
      return "Signing you in...";
    }

    if (mode === "signup") {
      return challenge ? "Verifying your code..." : "Sending your verification code...";
    }

    return challenge ? "Updating your password..." : "Sending your reset code...";
  }, [challenge, mode]);

  const onLogin = loginForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      const nextSession = await api.login(values);
      await setSession(nextSession);
    } catch (loginError) {
      logDeveloperError("auth.login", loginError);
      setError(getFriendlyLoginError(loginError));
    } finally {
      setPending(false);
    }
  });

  const onRequestSignup = signupRequestForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      setSuccess(null);
      const result = await api.requestSignup(values);
      const normalizedPhone = sanitizePhone(values.phone);
      setChallenge({
        identifier: values.email?.trim() || normalizedPhone,
        phone: normalizedPhone,
        session: result.session,
        password: values.password
      });
      signupVerifyForm.reset({
        code: "",
        phone: normalizedPhone,
        session: result.session
      });
    } catch (requestError) {
      logDeveloperError("auth.signup.request", requestError);
      setError(getFriendlyOtpRequestError(requestError));
    } finally {
      setPending(false);
    }
  });

  const onVerifySignup = signupVerifyForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      await api.verifySignup(values);
      if (!challenge?.password) {
        throw new Error("Missing signup password");
      }
      const nextSession = await api.login({
        identifier: challenge.identifier,
        password: challenge.password
      });
      await setSession(nextSession);
    } catch (verifyError) {
      logDeveloperError("auth.signup.verify", verifyError);
      setError(getFriendlyOtpVerifyError(verifyError));
    } finally {
      setPending(false);
    }
  });

  const onRequestReset = resetRequestForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      setSuccess(null);
      const result = await api.requestPasswordReset(values);
      setChallenge({
        identifier: values.identifier,
        session: result.session
      });
      resetVerifyForm.reset({
        identifier: values.identifier,
        session: result.session,
        code: "",
        newPassword: ""
      });
    } catch (requestError) {
      logDeveloperError("auth.password-reset.request", requestError);
      setError(getFriendlyOtpRequestError(requestError));
    } finally {
      setPending(false);
    }
  });

  const onVerifyReset = resetVerifyForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      await api.verifyPasswordReset(values);
      setChallenge(null);
      setSuccess("Password updated. You can now sign in.");
      resetRequestForm.reset({ identifier: values.identifier });
      resetVerifyForm.reset({ identifier: "", session: "", code: "", newPassword: "" });
    } catch (verifyError) {
      logDeveloperError("auth.password-reset.verify", verifyError);
      setError(getFriendlyOtpVerifyError(verifyError));
    } finally {
      setPending(false);
    }
  });

  const openConfirmation = async (intent: "signup" | "reset") => {
    setError(null);
    setSuccess(null);
    const valid =
      intent === "signup"
        ? await signupRequestForm.trigger()
        : await resetRequestForm.trigger();

    if (!valid) {
      setError(
        intent === "signup"
          ? "Check your details and try again."
          : "Enter the phone number or email for the account and try again."
      );
      return;
    }

    setConfirmIntent(intent);
  };

  const closeConfirmation = () => {
    if (pending) {
      return;
    }
    setConfirmIntent(null);
  };

  const continueWithConfirmation = () => {
    const intent = confirmIntent;
    setConfirmIntent(null);
    if (intent === "signup") {
      void onRequestSignup();
      return;
    }
    void onRequestReset();
  };

  return (
    <View className="rounded-3xl bg-white p-5">
      {title ? <Text className="font-jakarta-bold text-2xl text-rx-text">{title}</Text> : null}

      <View className={`${title ? "mt-5" : ""} gap-3`}>
        {mode === "login" ? (
          <>
            <Text className="font-jakarta-bold text-sm text-rx-text">Email or phone number</Text>
            <Controller control={loginForm.control} name="identifier" render={({ field }) => <Input placeholder="you@example.com or 024 123 4567" keyboardType="default" returnKeyType="next" value={field.value} onChangeText={field.onChange} />} />
            <Text className="font-jakarta-bold text-sm text-rx-text">Password</Text>
            <Controller control={loginForm.control} name="password" render={({ field }) => <Input placeholder="Enter your password" secureTextEntry returnKeyType="done" value={field.value} onChangeText={field.onChange} />} />
          </>
        ) : null}

        {mode === "signup" && !challenge ? (
          <>
            <Text className="font-jakarta-bold text-sm text-rx-text">Full name</Text>
            <Controller control={signupRequestForm.control} name="name" render={({ field }) => <Input placeholder="Ama Ofori" returnKeyType="next" value={field.value} onChangeText={field.onChange} />} />
            <Text className="font-jakarta-bold text-sm text-rx-text">Email (optional)</Text>
            <Controller control={signupRequestForm.control} name="email" render={({ field }) => <Input placeholder="ama@example.com" keyboardType="email-address" returnKeyType="next" value={field.value ?? ""} onChangeText={field.onChange} />} />
            <Text className="font-jakarta-bold text-sm text-rx-text">Phone number</Text>
            <Controller control={signupRequestForm.control} name="phone" render={({ field }) => <Input placeholder="024 123 4567" keyboardType="phone-pad" returnKeyType="next" value={field.value} onChangeText={field.onChange} />} />
            <Text className="font-jakarta-bold text-sm text-rx-text">Password</Text>
            <Controller control={signupRequestForm.control} name="password" render={({ field }) => <Input placeholder="Create a password" secureTextEntry returnKeyType="done" value={field.value} onChangeText={field.onChange} />} />
          </>
        ) : null}

        {mode === "signup" && challenge ? (
          <>
            <Text className="font-jakarta-bold text-sm text-rx-text">Phone verification code</Text>
            <Text className="font-jakarta text-sm text-rx-muted">Enter the code sent to {challenge.phone}.</Text>
            <Controller control={signupVerifyForm.control} name="code" render={({ field }) => <Input placeholder="123456" keyboardType="number-pad" returnKeyType="done" value={field.value} onChangeText={field.onChange} />} />
          </>
        ) : null}

        {mode === "forgot-password" && !challenge ? (
          <>
            <Text className="font-jakarta-bold text-sm text-rx-text">Email or phone number</Text>
            <Controller control={resetRequestForm.control} name="identifier" render={({ field }) => <Input placeholder="you@example.com or 024 123 4567" keyboardType="default" returnKeyType="done" value={field.value} onChangeText={field.onChange} />} />
            <Text className="font-jakarta text-sm text-rx-muted">We will send a verification code to the phone number on the account.</Text>
          </>
        ) : null}

        {mode === "forgot-password" && challenge ? (
          <>
            <Text className="font-jakarta-bold text-sm text-rx-text">Reset code</Text>
            <Text className="font-jakarta text-sm text-rx-muted">Enter the code sent to your verified phone number.</Text>
            <Controller control={resetVerifyForm.control} name="code" render={({ field }) => <Input placeholder="123456" keyboardType="number-pad" returnKeyType="next" value={field.value} onChangeText={field.onChange} />} />
            <Text className="font-jakarta-bold text-sm text-rx-text">New password</Text>
            <Controller control={resetVerifyForm.control} name="newPassword" render={({ field }) => <Input placeholder="Choose a new password" secureTextEntry returnKeyType="done" value={field.value} onChangeText={field.onChange} />} />
          </>
        ) : null}

        {error ? <Text className="font-jakarta text-sm text-red-600">{error}</Text> : null}
        {success ? <Text className="font-jakarta text-sm text-emerald-700">{success}</Text> : null}

        <ScaleButton
          onPress={() => {
            if (pending) {
              return;
            }
            if (mode === "login") {
              void onLogin();
              return;
            }
            if (mode === "signup") {
              if (challenge) {
                void onVerifySignup();
                return;
              }
              void openConfirmation("signup");
              return;
            }
            if (challenge) {
              void onVerifyReset();
              return;
            }
            void openConfirmation("reset");
          }}
          className="mt-1 rounded-full bg-rx-accent py-4"
        >
          <Text className="text-center font-jakarta-bold text-base text-white">
            {pending ? pendingLabel : submitLabel}
          </Text>
        </ScaleButton>

      </View>

      <Modal transparent visible={confirmIntent !== null} animationType="fade" onRequestClose={closeConfirmation}>
        <Pressable className="flex-1 bg-black/20 px-5" onPress={closeConfirmation}>
          <View className="flex-1 items-center justify-center">
            <Pressable className="w-full max-w-[360px] rounded-[28px] bg-white p-6" onPress={(event) => event.stopPropagation()}>
              <Text className="font-jakarta-bold text-2xl text-rx-text">
                {confirmIntent === "signup" ? "Verify your phone number" : "Send your reset code"}
              </Text>
              <Text className="mt-3 font-jakarta text-sm leading-6 text-rx-muted">
                {confirmIntent === "signup"
                  ? "By continuing, we will send you an OTP to verify your phone number before we finish creating your account."
                  : "By continuing, we will send a reset code to the verified phone number connected to this account."}
              </Text>
              <View className="mt-6 flex-row gap-3">
                <ScaleButton onPress={closeConfirmation} className="flex-1 rounded-full bg-rx-background py-3.5">
                  <Text className="text-center font-jakarta-bold text-sm text-rx-text">Cancel</Text>
                </ScaleButton>
                <ScaleButton onPress={continueWithConfirmation} className="flex-1 rounded-full bg-rx-accent py-3.5">
                  <Text className="text-center font-jakarta-bold text-sm text-white">Continue</Text>
                </ScaleButton>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Input({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  returnKeyType,
  secureTextEntry
}: {
  placeholder: string;
  value?: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad" | "email-address";
  returnKeyType?: "done" | "next";
  secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      returnKeyType={returnKeyType}
      secureTextEntry={secureTextEntry}
      placeholder={placeholder}
      placeholderTextColor="#6B7280"
      className="rounded-2xl border border-rx-border bg-rx-background px-4 py-4 font-jakarta text-base leading-6 text-rx-text"
    />
  );
}
