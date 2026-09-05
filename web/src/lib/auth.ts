import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const configuredProviders: NextAuthOptions["providers"] = [
  ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
    ? [
        GithubProvider({
          clientId: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
        }),
      ]
    : []),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
];

const devLoginEmail = process.env.DEV_LOGIN_EMAIL?.trim().toLowerCase();
const devLoginPassword = process.env.DEV_LOGIN_PASSWORD;

if (process.env.NODE_ENV === "development" && devLoginEmail && devLoginPassword) {
  configuredProviders.push(
    CredentialsProvider({
      name: "Development login",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email || email !== devLoginEmail || credentials?.password !== devLoginPassword) {
          return null;
        }

        const user = await prisma.user.upsert({
          where: { email },
          update: { name: "Development User" },
          create: { email, name: "Development User" },
        });

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: configuredProviders,
  callbacks: {
    session: ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
