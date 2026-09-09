"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession, signOut } from "next-auth/react";

const AUTH_ROUTES = ["/login", "/register", "/api/auth"];

function ForceSignOutGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!isAuthPage && (session as unknown as Record<string, unknown>)?.forceSignOut) {
      signOut({ callbackUrl: "/login" });
    }
  }, [session, isAuthPage]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ForceSignOutGuard>{children}</ForceSignOutGuard>
    </SessionProvider>
  );
}