"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input, Label, Card, CardHeader, CardContent, CardFooter } from "@/components/ui";
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { Footer } from "@/components/marketing";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("As passwords não coincidem");
            return;
        }

        // Validate password length
        if (password.length < 8) {
            setError("A password deve ter pelo menos 8 caracteres");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Ocorreu um erro. Tente novamente.");
            } else {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            }
        } catch {
            setError("Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // No token in URL
    if (!token) {
        return (
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <h1 className="text-xl font-semibold">Link inválido</h1>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Este link não é válido. Por favor, peça um novo link de recuperação.
                    </div>
                </CardContent>
                <CardFooter className="justify-center">
                    <Link
                        href="/forgot-password"
                        className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                        Pedir novo link
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                    <KeyRound className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <h1 className="text-xl font-semibold">Criar nova password</h1>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                    Introduza a sua nova password abaixo.
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Password alterada com sucesso!</p>
                                <p className="mt-1 text-xs opacity-80">
                                    A redirecionar para o login...
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nova password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className="pr-10"
                                    required
                                    minLength={8}
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
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                                Mínimo de 8 caracteres
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar password</Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                                minLength={8}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-400 to-emerald-400 hover:from-blue-500 hover:to-emerald-500 text-white border-0"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    A guardar...
                                </>
                            ) : (
                                "Guardar nova password"
                            )}
                        </Button>
                    </form>
                )}
            </CardContent>

            {!success && (
                <CardFooter className="justify-center">
                    <Link
                        href="/login"
                        className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                        Voltar ao login
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
}

function ResetPasswordFallback() {
    return (
        <Card className="w-full max-w-sm">
            <CardContent className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-muted-foreground)]" />
            </CardContent>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Header */}
            <header className="border-b border-[var(--color-border)]">
                <div className="container-app flex h-14 items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-gradient">
                        Ritmo
                    </Link>
                    <Link href="/login" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                        Iniciar sessão
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="flex flex-1 items-center justify-center p-6">
                <Suspense fallback={<ResetPasswordFallback />}>
                    <ResetPasswordForm />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
