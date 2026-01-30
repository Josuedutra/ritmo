"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Button,
    Input,
    Label,
    Card,
    CardHeader,
    CardContent,
    CardFooter,
} from "@/components/ui";
import { AlertCircle, Eye, EyeOff, Check, Users, Loader2 } from "lucide-react";
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

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        companyName: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [referralPartner, setReferralPartner] = useState<string | null>(null);
    const [referralCaptured, setReferralCaptured] = useState(false);

    // Capture referral code from URL on mount and handle ?provider=google
    useEffect(() => {
        const refCode = searchParams.get("ref");
        const provider = searchParams.get("provider");

        const captureAndProceed = async () => {
            if (refCode) {
                // Capture the referral code and set cookie
                try {
                    const res = await fetch("/api/referrals/capture", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code: refCode }),
                    });
                    const data = await res.json();
                    if (data.success && data.partnerName) {
                        setReferralPartner(data.partnerName);
                    }
                } catch {
                    // Ignore errors
                }
            }
            setReferralCaptured(true);

            // Auto-trigger Google sign-in if ?provider=google
            if (provider === "google" && status !== "authenticated") {
                setGoogleLoading(true);
                try {
                    await signIn("google", {
                        callbackUrl: "/signup",
                    });
                } catch {
                    setError("Erro ao criar conta com Google");
                    setGoogleLoading(false);
                }
            }
        };

        captureAndProceed();
    }, [searchParams, status]);

    // Process OAuth referral after login
    const processOAuthReferral = useCallback(async () => {
        if (status === "authenticated" && session?.user?.organizationId) {
            try {
                await fetch("/api/auth/oauth-referral", {
                    method: "POST",
                });
            } catch {
                // Ignore errors
            }
            // Redirect to onboarding
            router.push("/onboarding");
            router.refresh();
        }
    }, [status, session, router]);

    useEffect(() => {
        // If user just logged in via OAuth, process referral and redirect
        if (status === "authenticated") {
            processOAuthReferral();
        }
    }, [status, processOAuthReferral]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 1. Create account via API
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Erro ao criar conta");
                setLoading(false);
                return;
            }

            // 2. Auto-login after signup
            const signInResult = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (signInResult?.error) {
                setError("Conta criada, mas erro ao iniciar sessão. Tente fazer login.");
                setLoading(false);
                return;
            }

            // 3. Redirect to onboarding (requirement B.3)
            router.push("/onboarding");
            router.refresh();
        } catch {
            setError("Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setError("");
        setGoogleLoading(true);

        try {
            // Google OAuth - cookie is already set, will be processed after callback
            await signIn("google", {
                callbackUrl: "/signup", // Return here to process referral and redirect
            });
        } catch {
            setError("Erro ao criar conta com Google");
            setGoogleLoading(false);
        }
    };

    // Show loading if processing OAuth callback
    if (status === "loading" || (status === "authenticated" && !error)) {
        return (
            <div className="flex w-full max-w-sm items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm space-y-6">
            <Card>
                <CardHeader className="text-center">
                    <h1 className="text-xl font-semibold">Criar conta</h1>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                        Comece o seu trial de 14 dias
                    </p>
                    {/* Referral partner badge */}
                    {referralPartner && (
                        <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]">
                            <Users className="h-3.5 w-3.5" />
                            <span>Indicado por {referralPartner}</span>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Google Sign Up Button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-3"
                        onClick={handleGoogleSignUp}
                        disabled={googleLoading || loading || !referralCaptured}
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
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="O seu nome"
                                autoComplete="name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="seu@email.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Mínimo 6 caracteres"
                                    autoComplete="new-password"
                                    className="pr-10"
                                    required
                                    minLength={6}
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

                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nome da empresa</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                type="text"
                                value={formData.companyName}
                                onChange={handleChange}
                                placeholder="Opcional"
                                autoComplete="organization"
                            />
                        </div>

                        {/* Trial benefits */}
                        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
                            <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">
                                Incluído no trial:
                            </p>
                            <ul className="space-y-1.5 text-xs text-[var(--color-muted-foreground)]">
                                <li className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-500" />
                                    14 dias de acesso completo
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-500" />
                                    20 envios de follow-up
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-500" />
                                    Emails automáticos + BCC
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-500" />
                                    Sem cartão de crédito
                                </li>
                            </ul>
                        </div>

                        <Button type="submit" variant="brand" className="w-full" disabled={loading || googleLoading}>
                            {loading ? "A criar conta..." : "Começar trial"}
                        </Button>
                    </form>

                    <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                        Ao criar conta, aceita os{" "}
                        <Link
                            href="/termos"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-[var(--color-foreground)]"
                        >
                            Termos de Serviço
                        </Link>
                        {" "}e a{" "}
                        <Link
                            href="/privacidade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-[var(--color-foreground)]"
                        >
                            Política de Privacidade
                        </Link>
                    </p>
                </CardContent>

                <CardFooter className="justify-center">
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                        Já tem conta?{" "}
                        <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
                            Iniciar sessão
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SignupPage() {
    return (
        <div data-theme="light" className="light flex min-h-screen flex-col bg-white text-zinc-950">
            {/* Header */}
            <header className="border-b border-[var(--color-border)]">
                <div className="container-app flex h-14 items-center justify-between">
                    <Logo href="/" size="sm" />
                    <Link href="/login" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                        Já tem conta? Entrar
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="flex flex-1 items-center justify-center p-6">
                <Suspense fallback={<div className="w-full max-w-sm animate-pulse">A carregar...</div>}>
                    <SignupForm />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
