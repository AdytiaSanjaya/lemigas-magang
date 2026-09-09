"use client";

import { useEffect } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";

function ForceSignOutGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if ((session as unknown as Record<string, unknown>)?.forceSignOut) {
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ForceSignOutGuard>{children}</ForceSignOutGuard>
    </SessionProvider>
  );
}