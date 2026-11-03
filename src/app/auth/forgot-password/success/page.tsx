import { ReturnButton } from "@/components/auth/return-button";

export default function ForgotPasswordSuccessPage() {
  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/auth/login" label="Login" />
        <h1 className="text-3xl font-bold">Success</h1>
      </div>
      <p className="text-muted-foreground">
        Success! You have requested a password reset. Please check your email
        for the reset password link.
      </p>
    </div>
  );
}
