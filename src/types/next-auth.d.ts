import { DefaultSession } from "next-auth";

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isWorkspaceAdmin: boolean;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isWorkspaceAdmin: boolean;
    } & DefaultSession["user"];
  }
}
