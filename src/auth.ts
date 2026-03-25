import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/password";
import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = String(credentials.email).trim().toLowerCase();

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isWorkspaceAdmin: user.isWorkspaceAdmin,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isWorkspaceAdmin = (user as any).isWorkspaceAdmin ?? false;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isWorkspaceAdmin = (token.isWorkspaceAdmin as boolean) ?? false;
        session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false;
      }
      return session;
    },
  },
});
