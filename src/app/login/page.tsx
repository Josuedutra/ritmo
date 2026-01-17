"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Email ou password incorretos");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold">
                        <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] bg-clip-text text-transparent">
                            Ritmo
                        </span>
                    </h1>
                    <p className="mt-2 text-[var(--color-muted-foreground)]">
                        Inicie sessão para continuar
                    </p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-xl bg-[var(--color-card)] p-8"
                >
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium"
                        >
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] px-4 py-3 text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] px-4 py-3 text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "A entrar..." : "Entrar"}
                    </button>
                </form>

                {/* Dev hint */}
                <div className="mt-4 rounded-lg bg-[var(--color-card)] p-4 text-center text-sm text-[var(--color-muted-foreground)]">
                    <strong>Dev:</strong> admin@demo.ritmo.app / demo123
                </div>
            </div>
        </div>
    );
}
