"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { AlertCircle, Eye, EyeOff, Check } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        companyName: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="flex min-h-screen flex-col">
            {/* Header */}
            <header className="border-b border-[var(--color-border)]">
                <div className="container-app flex h-14 items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-gradient">
                        Ritmo
                    </Link>
                    <Link href="/login" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                        Já tem conta? Entrar
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-6">
                    <Card>
                        <CardHeader className="text-center">
                            <h1 className="text-xl font-semibold">Criar conta</h1>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                Comece o seu trial de 14 dias
                            </p>
                        </CardHeader>

                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                {error && (
                                    <div className="flex items-center gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

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
                            </CardContent>

                            <CardFooter className="flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "A criar conta..." : "Começar trial"}
                                </Button>
                                <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                                    Ao criar conta, aceita os{" "}
                                    <Link href="/terms" className="underline">
                                        Termos de Serviço
                                    </Link>
                                </p>
                            </CardFooter>
                        </form>
                    </Card>

                    <p className="text-center text-sm text-[var(--color-muted-foreground)]">
                        Já tem conta?{" "}
                        <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
                            Iniciar sessão
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
