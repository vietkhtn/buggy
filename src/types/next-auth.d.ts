import { DefaultSession } from "next-auth";

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isWorkspaceAdmin: boolean;
    mustChangePassword: boolean;
  }
}

declare module "next-auth" {
  interface User {
    isWorkspaceAdmin?: boolean;
    mustChangePassword?: boolean;
  }
  interface Session {
    user: {
      id: string;
      isWorkspaceAdmin: boolean;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}
