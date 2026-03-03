"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Crisp Chat Widget — loads on authenticated pages only.
 * Requires NEXT_PUBLIC_CRISP_WEBSITE_ID env var.
 *
 * Positioned bottom-right. Identifies user by email for
 * unified inbox tracking.
 */
export function CrispWidget() {
    const { data: session } = useSession();

    useEffect(() => {
        const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
        if (!websiteId || !session?.user) return;

        // Avoid double-init
        if (window.$crisp) return;

        window.$crisp = [];
        window.CRISP_WEBSITE_ID = websiteId;

        const script = document.createElement("script");
        script.src = "https://client.crisp.chat/l.js";
        script.async = true;
        document.head.appendChild(script);

        // Identify the user once Crisp is ready
        script.onload = () => {
            if (session.user.email) {
                window.$crisp.push(["set", "user:email", [session.user.email]]);
            }
            if (session.user.name) {
                window.$crisp.push(["set", "user:nickname", [session.user.name]]);
            }
        };

        return () => {
            // Cleanup on unmount (rare — layout-level component)
            try {
                document.head.removeChild(script);
                delete window.$crisp;
                delete window.CRISP_WEBSITE_ID;
            } catch {
                // noop
            }
        };
    }, [session]);

    return null;
}

// Type augmentation for Crisp globals
declare global {
    interface Window {
        $crisp: unknown[];
        CRISP_WEBSITE_ID: string;
    }
}
