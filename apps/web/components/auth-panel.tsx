"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { otpRequestSchema, otpVerifySchema, type OtpRequestInput, type OtpVerifyInput } from "@roomxchange/contracts";
import { useSession } from "./session-provider";

type ChallengeState = {
  phone: string;
  session: string;
};

export function AuthPanel({ title = "Sign in to continue" }: { title?: string }) {
  const { api, setSession } = useSession();
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const requestForm = useForm<OtpRequestInput>({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: {
      phone: "",
      name: "",
      email: ""
    }
  });

  const verifyForm = useForm<OtpVerifyInput>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: {
      phone: "",
      session: "",
      code: "",
      name: "",
      email: ""
    }
  });

  const submitRequest = requestForm.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      const response = await api.requestOtp(values);
      setChallenge({
        phone: values.phone,
        session: response.session
      });
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
      const session = await api.verifyOtp(values);
      startTransition(() => setSession(session));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to verify OTP.");
    } finally {
      setPending(false);
    }
  });

  return (
    <div className="card" style={{ padding: 28, display: "grid", gap: 20 }}>
      <div>
        <div className="pill" style={{ marginBottom: 14 }}>
          Web-only payments, Apple-safe
        </div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Use your phone number to manage listings and complete subscription checkout on the web.
        </p>
      </div>

      {!challenge ? (
        <form className="form-grid" onSubmit={submitRequest}>
          <label className="field full">
            <span>Phone number</span>
            <input placeholder="+1 555 123 4567" {...requestForm.register("phone")} />
          </label>
          <label className="field">
            <span>Full name</span>
            <input placeholder="Keira Wells" {...requestForm.register("name")} />
          </label>
          <label className="field">
            <span>Email for receipts</span>
            <input placeholder="you@example.com" {...requestForm.register("email")} />
          </label>
          {error ? <div className="full muted" style={{ color: "var(--rx-danger)" }}>{error}</div> : null}
          <button className="button full" type="submit" disabled={pending}>
            {pending ? "Sending code..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={submitVerify}>
          <label className="field full">
            <span>Verification code</span>
            <input placeholder="123456" {...verifyForm.register("code")} />
          </label>
          <p className="full muted" style={{ margin: 0 }}>
            We sent a code to {challenge.phone}. Complete verification to unlock your dashboard and checkout.
          </p>
          {error ? <div className="full muted" style={{ color: "var(--rx-danger)" }}>{error}</div> : null}
          <button className="button full" type="submit" disabled={pending}>
            {pending ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}
    </div>
  );
}
