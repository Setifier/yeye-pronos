import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ReturnButton } from "@/components/auth/return-button";
import { redirect } from "next/navigation";

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const token = (await searchParams).token;

  if (!token) redirect("/auth/login");

  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/auth/login" label="Login" />
        <h1 className="text-3xl font-bold">Reset Password</h1>
      </div>
      <p className="text-muted-foreground">
        Please enter your new password below. Make sure it is at least 8
        characters.
      </p>

      <ResetPasswordForm token={token} />
    </div>
  );
}
