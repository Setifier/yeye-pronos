import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { admin, customSession, magicLink } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/argon2";
import { getValidDomains, normalizeName } from "@/lib/utils";
import { UserRole } from "@/generated/prisma";
import { ac, roles } from "@/lib/permissions";
import { sendEmailAction } from "@/actions/send-email.action";
import { generateUniqueFriendCode } from "@/lib/friend-code";

const options = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: String(process.env.GOOGLE_CLIENT_ID),
      clientSecret: String(process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmailAction({
        to: user.email,
        subject: "Réinitialiser ton mot de passe",
        meta: {
          description: "Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe. Le lien est valable 1 heure.",
          link: url,
        },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url }) => {
      const link = new URL(url);
      link.searchParams.set("callbackURL", "/auth/verify");

      await sendEmailAction({
        to: user.email,
        subject: "Confirme ton adresse e-mail",
        meta: {
          description: "Bienvenue ! Clique sur le bouton ci-dessous pour activer ton compte et commencer à pronostiquer.",
          link: String(link),
        },
      });
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const email = String(ctx.body?.email);
        const domain = (email.split("@")[1] ?? "").trim().toLowerCase();

        const VALID_DOMAINS = getValidDomains();
        if (!VALID_DOMAINS.includes(domain)) {
          throw new APIError("BAD_REQUEST", {
            message: `Les adresses @${domain} ne sont pas acceptées. Utilise une adresse Gmail, Outlook, iCloud, Orange, Free…`,
          });
        }

        // Normaliser le nom (enlever espaces superflus, etc.)
        const name = normalizeName(ctx.body?.name ?? "");

        return {
          context: {
            ...ctx,
            body: {
              ...ctx.body,
              name,
            },
          },
        };
      }

      if (ctx.path === "/sign-in/magic-link") {
        return {
          context: {
            ...ctx,
            body: {
              ...ctx.body,
              name: normalizeName(ctx.body.name),
            },
          },
        };
      }

      if (ctx.path === "/update-user") {
        return {
          context: {
            ...ctx,
            body: {
              ...ctx.body,
              // Normaliser le nom seulement s'il est fourni
              ...(ctx.body?.name && { name: normalizeName(ctx.body.name) }),
            },
          },
        };
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Tolère espaces et majuscules dans la variable (« a@x.com; B@y.com »)
          const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
            .split(";").map((e) => e.trim().toLowerCase()).filter(Boolean);

          // Générer un friendCode unique
          const friendCode = await generateUniqueFriendCode();

          const userData = {
            ...user,
            friendCode,
          };

          if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return { data: { ...userData, role: UserRole.ADMIN } };
          }
          return { data: userData };
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"] as Array<UserRole>,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    cookieCache: {
      // ❌ Désactivé temporairement pour résoudre l'erreur 431
      enabled: false,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      // Lier automatiquement les comptes avec le même email
      // Cela permet de se connecter avec Google même si on a créé le compte avec email/password
      trustedProviders: ["google", "github"],
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  plugins: [
    nextCookies(),
    admin({
      defaultRole: UserRole.USER,
      adminRoles: [UserRole.ADMIN],
      ac,
      roles,
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmailAction({
          to: email,
          subject: "Ton lien de connexion",
          meta: {
            description: "Clique sur le bouton ci-dessous pour te connecter, sans mot de passe. Le lien est valable 15 minutes.",
            link: url,
          },
        });
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ user, session }) => {
      // Fetch additional user data for onboarding status
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { hasCompletedOnboarding: true },
      });

      return {
        session: {
          expiresAt: session.expiresAt,
          token: session.token,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          role: user.role,
          hasCompletedOnboarding: userData?.hasCompletedOnboarding ?? false,
        },
      };
    }, options),
  ],
});

export type ErrorCode = keyof typeof auth.$ERROR_CODES | "UNKNOWN";
