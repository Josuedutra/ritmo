"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Card, CardHeader, CardContent, CardFooter } from "@/components/ui";
import { AlertCircle, CheckCircle, ArrowLeft, Loader2, Mail } from "lucide-react";
import { Footer } from "@/components/marketing";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok && response.status !== 200) {
                setError(data.error || "Ocorreu um erro. Tente novamente.");
            } else {
                setSuccess(true);
            }
        } catch {
            setError("Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

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
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                            <Mail className="h-6 w-6 text-[var(--color-primary)]" />
                        </div>
                        <h1 className="text-xl font-semibold">Esqueceu a password?</h1>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                            Introduza o seu email e enviamos instruções para repor a password.
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
                                        <p className="font-medium">Email enviado!</p>
                                        <p className="mt-1 text-xs opacity-80">
                                            Se o email existir na nossa base de dados, receberá instruções para repor a password.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-center text-[var(--color-muted-foreground)]">
                                    Não recebeu o email? Verifique a pasta de spam ou{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSuccess(false);
                                            setEmail("");
                                        }}
                                        className="text-[var(--color-primary)] hover:underline"
                                    >
                                        tente novamente
                                    </button>
                                </p>
                            </div>
                        ) : (
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

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-blue-400 to-emerald-400 hover:from-blue-500 hover:to-emerald-500 text-white border-0"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            A enviar...
                                        </>
                                    ) : (
                                        "Enviar instruções"
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>

                    <CardFooter className="justify-center">
                        <Link
                            href="/login"
                            className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao login
                        </Link>
                    </CardFooter>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
