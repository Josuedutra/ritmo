import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OpsClient } from "./ops-client";

// SUPERADMIN emails from environment
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

export default async function AdminOpsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Check if user is SUPERADMIN
    const userEmail = session.user.email?.toLowerCase();
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-semibold">Ritmo Admin - Ops</h1>
                        <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                            Internal Only
                        </span>
                    </div>
                    <span className="text-sm text-[var(--color-muted-foreground)]">
                        {session.user.email}
                    </span>
                </div>
            </header>

            <main className="container mx-auto p-6">
                <OpsClient />
            </main>
        </div>
    );
}
