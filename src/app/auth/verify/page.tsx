import { ReturnButton } from "@/components/return-button";
import { SendVerificationEmailForm } from "@/components/send-verification-email-form";
import { redirect } from "next/navigation";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    error: string;
  }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const error = (await searchParams).error;

  if (!error) redirect("/onboarding");

  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/auth/login" label="Login" />
        <h1 className="text-3xl font-bold">Verify Email</h1>
      </div>
      <p className="text-destructive">
        {error === "invalid_token" || error === "token_expired"
          ? "Invalid token or expired. Please try again."
          : error === "email_not_verified"
          ? "Email not verified. Please check your email for the verification link."
          : "Oops! Something went wrong. Please try again."}
      </p>
      <SendVerificationEmailForm />
    </div>
  );
}
