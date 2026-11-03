import { ReturnButton } from "@/components/auth/return-button";

interface LoginErrorPageProps {
  searchParams: Promise<{
    error: string;
  }>;
}

export default async function LoginErrorPage({
  searchParams,
}: LoginErrorPageProps) {
  const sp = await searchParams;

  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/auth/login" label="Login" />
        <h1 className="text-3xl font-bold">Login Error</h1>
      </div>
      <p className="text-destructive">
        {sp.error === "account_not_linked"
          ? "This account is already linked to another sign in method."
          : "Oops! Something went wrong. Please try again."}
      </p>
    </div>
  );
}
