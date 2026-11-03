"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { requestPasswordReset } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { useRouter } from "next/navigation";

export const ForgotPasswordForm = () => {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const formData = new FormData(evt.target as HTMLFormElement);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) return toast.error("Indique ton adresse e-mail");

    await requestPasswordReset({
      email,
      redirectTo: "/auth/reset-password",
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (ctx: any) => {
          toast.error(translateAuthError(ctx.error?.code, ctx.error?.message));
        },
        onSuccess: () => {
          toast.success("Lien de réinitialisation envoyé");
          router.push("/auth/forgot-password/success");
        },
      },
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input type="email" id="email" name="email" autoComplete="email" />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Envoi…" : "Recevoir le lien de réinitialisation"}
        </Button>
      </form>
    </div>
  );
};
