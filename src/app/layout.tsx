import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yeye Pronos - Pronostiquez les matchs NBA",
  description:
    "Pronostiquez les résultats des matchs NBA et grimpez dans le classement",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Charger l'image et le statut onboarding de l'utilisateur si connecté
  let userWithImage = null;
  if (session?.user) {
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        image: true,
        hasCompletedOnboarding: true,
      },
    });

    userWithImage = {
      ...session.user,
      image: userData?.image || null,
      hasCompletedOnboarding: userData?.hasCompletedOnboarding ?? false,
    };
  }

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-white flex flex-col min-h-screen`}
      >
        <Navbar user={userWithImage} />
        {children}
        <Footer />
        {userWithImage?.hasCompletedOnboarding && <MobileTabBar />}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
