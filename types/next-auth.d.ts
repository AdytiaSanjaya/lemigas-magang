import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      unitId: string | null;
      unitNama: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    unitId?: string | null;
    unitNama?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    unitId?: string | null;
    unitNama?: string | null;
  }
}