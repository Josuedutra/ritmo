"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input, Label, Card, CardHeader, CardContent, CardFooter } from "@/components/ui";
import { AlertCircle, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { Footer } from "@/components/marketing";
import { Logo } from "@/components/brand";

// Google Icon SVG
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

// Sanitize redirect URL to prevent open redirect attacks
function sanitizeRedirectUrl(url: string | null): string {
    if (!url) return "/dashboard";
    // Must start with / and not contain :// (prevent http://evil.com)
    if (url.startsWith("/") && !url.includes("://")) {
        return url;
    }
    return "/dashboard";
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = sanitizeRedirectUrl(searchParams.get("next"));

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

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
                // Redirect to sanitized ?next= param or dashboard
                router.push(next);
                router.refresh();
            }
        } catch {
            setError("Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setGoogleLoading(true);

        try {
            await signIn("google", {
                callbackUrl: next,
            });
        } catch {
            setError("Erro ao iniciar sessão com Google");
            setGoogleLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <h1 className="text-xl font-semibold">Iniciar sessão</h1>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                    Entre com as suas credenciais
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Google Sign In Button */}
                <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-3"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                >
                    {googleLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <GoogleIcon className="h-5 w-5" />
                    )}
                    Continuar com Google
                </Button>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-[var(--color-border)]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[var(--color-card)] px-2 text-[var(--color-muted-foreground)]">
                            ou continue com email
                        </span>
                    </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-[var(--color-primary)] hover:underline"
                            >
                                Esqueci a password
                            </Link>
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                className="pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Demo credentials callout - only show if NEXT_PUBLIC_SHOW_DEMO=true */}
                    {process.env.NEXT_PUBLIC_SHOW_DEMO === "true" && (
                        <div className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-3 py-2">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                            <div className="text-xs text-[var(--color-muted-foreground)]">
                                <span className="font-medium">Demo:</span>{" "}
                                <code className="rounded bg-[var(--color-background)] px-1">admin@demo.ritmo.app</code>
                                {" / "}
                                <code className="rounded bg-[var(--color-background)] px-1">demo123</code>
                            </div>
                        </div>
                    )}

                    <Button type="submit" variant="brand" className="w-full" disabled={loading || googleLoading}>
                        {loading ? "A entrar..." : "Entrar"}
                    </Button>
                </form>
            </CardContent>

            <CardFooter className="justify-center">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                    Não tem conta?{" "}
                    <Link href="/signup" className="font-medium text-[var(--color-primary)] hover:underline">
                        Criar conta
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

function LoginFormFallback() {
    return (
        <Card className="w-full max-w-sm">
            <CardContent className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-muted-foreground)]" />
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Header */}
            <header className="border-b border-[var(--color-border)]">
                <div className="container-app flex h-14 items-center justify-between">
                    <Logo href="/" size="sm" />
                    <Link href="/signup" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                        Criar conta
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="flex flex-1 items-center justify-center p-6">
                <Suspense fallback={<LoginFormFallback />}>
                    <LoginForm />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
