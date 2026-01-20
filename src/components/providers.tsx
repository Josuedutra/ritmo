"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

/**
 * Client-side providers wrapper.
 * Includes SessionProvider for NextAuth useSession() hook support.
 */
export function Providers({ children }: ProvidersProps) {
    return <SessionProvider>{children}</SessionProvider>;
}
