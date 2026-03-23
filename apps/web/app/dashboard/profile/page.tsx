"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { profileUpdateSchema, type ProfileUpdateInput } from "@roomxchange/contracts";
import { useSession } from "../../../components/session-provider";

export default function ProfilePage() {
  const { api, session, setSession } = useSession();
  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: session?.user.name ?? "",
      email: session?.user.email ?? "",
      avatar: session?.user.avatar ?? ""
    }
  });

  const mutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (user) => {
      if (session) {
        setSession({
          ...session,
          user
        });
      }
    }
  });

  return (
    <section className="grid">
      <div>
        <h2 style={{ marginBottom: 6 }}>Profile</h2>
        <p className="muted" style={{ margin: 0 }}>
          Keep your payout receipt email and public owner profile current.
        </p>
      </div>
      <form className="card form-grid" style={{ padding: 24 }} onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <label className="field full">
          <span>Name</span>
          <input {...form.register("name")} />
        </label>
        <label className="field">
          <span>Email</span>
          <input {...form.register("email")} />
        </label>
        <label className="field">
          <span>Avatar URL</span>
          <input {...form.register("avatar")} />
        </label>
        <button className="button full" type="submit">
          {mutation.isPending ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
