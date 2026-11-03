import { ReturnButton } from "@/components/auth/return-button";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/auth/login" label="Login" />
        <h1 className="text-3xl font-bold">Forgot Password</h1>
      </div>
      <p className="text-muted-foreground">
        Please enter your email address below and we will send you a link to
        reset your password.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
