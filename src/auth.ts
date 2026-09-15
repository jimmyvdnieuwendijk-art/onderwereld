import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { DEMO_EMAIL, grantDemoTestCash } from "@/lib/ensure-catalog";
import {
  facebookCredentials,
  FacebookAuthError,
  upsertFacebookUser,
} from "@/lib/auth/facebook";

const facebook = facebookCredentials();

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // Equivalent to AUTH_TRUST_HOST=true on Vercel (Host header / JWT cookies).
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/inloggen",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
        totp: { label: "Authenticatorcode", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        const totp = String(credentials?.totp ?? "").trim();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            username: true,
            hashedPassword: true,
            totpEnabled: true,
            totpSecret: true,
          },
        });
        if (!user?.hashedPassword) return null;

        const valid = await compare(password, user.hashedPassword);
        if (!valid) return null;

        if (user.totpEnabled) {
          if (!user.totpSecret || !verifyTotp(user.totpSecret, totp)) return null;
        }

        if (email === DEMO_EMAIL) {
          void grantDemoTestCash().catch(() => undefined);
        }

        void prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => undefined);

        return { id: user.id, email: user.email, name: user.username };
      },
    }),
    ...(facebook
      ? [
          Facebook({
            clientId: facebook.id,
            clientSecret: facebook.secret,
            profile(profile) {
              const picture =
                profile && typeof profile === "object" && "picture" in profile
                  ? (
                      profile as {
                        picture?: { data?: { url?: string } };
                      }
                    ).picture?.data?.url
                  : undefined;
              return {
                id: String(profile.id),
                name: profile.name ?? "Speler",
                email: profile.email,
                image: picture,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "facebook") return true;
      try {
        await upsertFacebookUser({
          facebookId: String(account.providerAccountId ?? profile?.id ?? ""),
          email: profile?.email,
          name: profile?.name,
        });
        return true;
      } catch (error) {
        if (error instanceof FacebookAuthError && error.code === "email_taken") {
          return "/inloggen?error=FacebookEmail";
        }
        return "/inloggen?error=Facebook";
      }
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "facebook") {
        const dbUser = await upsertFacebookUser({
          facebookId: String(account.providerAccountId ?? profile?.id ?? ""),
          email: profile?.email,
          name: profile?.name,
        });
        token.id = dbUser.id;
        token.name = dbUser.username;
        return token;
      }
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.name = token.name;
      }
      return session;
    },
  },
});
