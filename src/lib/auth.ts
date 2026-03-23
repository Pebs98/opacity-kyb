import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    // Email magic link via Resend (production)
    ...(process.env.AUTH_RESEND_KEY
      ? [
          Resend({
            from: "Opacity KYB <noreply@opacity.network>",
          }),
        ]
      : []),
    // Dev-only credentials provider for testing without email
    ...(process.env.NODE_ENV === "development"
      ? [
          Credentials({
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              const email = credentials.email as string;
              let user = await db.user.findUnique({ where: { email } });
              if (!user) {
                user = await db.user.create({
                  data: {
                    email,
                    name: email.split("@")[0],
                    role: email.includes("reviewer") ? "REVIEWER" : "APPLICANT",
                  },
                });
              }
              return user;
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email! },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
