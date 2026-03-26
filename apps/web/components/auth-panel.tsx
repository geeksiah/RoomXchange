"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { adminLoginSchema, type AdminLoginInput } from "@roomxchange/contracts";
import { useSession } from "./session-provider";

export function AuthPanel({ title = "Admin Sign In" }: { title?: string }) {
  const { adminLogin } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      setPending(true);
      setError(null);
      await adminLogin(values.email, values.password);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  });

  return (
    <div className="admin-auth-wrap">
      <div className="admin-auth-card">
        <div className="admin-auth-badge">
          <ShieldCheck size={16} />
          Restricted access
        </div>
        <div className="admin-auth-copy">
          <h1>{title}</h1>
          <p>Operational access for RoomXchange admins.</p>
        </div>

        <form className="admin-auth-form" onSubmit={submit}>
          <label className="admin-field">
            <span>Email</span>
            <input placeholder="admin@roomxchange.com" {...form.register("email")} />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <input type="password" placeholder="Enter password" {...form.register("password")} />
          </label>
          {error ? <div className="admin-error">{error}</div> : null}
          <button className="admin-primary-button" type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
