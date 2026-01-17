import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import {
    FileText,
    PlusCircle,
    Search,
    type LucideIcon
} from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        href: string;
    };
    className?: string;
    children?: ReactNode;
}

export function EmptyState({
    icon: Icon = FileText,
    title,
    description,
    action,
    className,
    children,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/50 px-6 py-12 text-center",
                className
            )}
        >
            <div className="mb-4 rounded-full bg-[var(--color-muted)] p-3">
                <Icon className="h-6 w-6 text-[var(--color-muted-foreground)]" />
            </div>

            <h3 className="mb-1 text-sm font-medium text-[var(--color-foreground)]">
                {title}
            </h3>

            {description && (
                <p className="mb-4 max-w-sm text-sm text-[var(--color-muted-foreground)]">
                    {description}
                </p>
            )}

            {action && (
                <Link href={action.href}>
                    <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {action.label}
                    </Button>
                </Link>
            )}

            {children}
        </div>
    );
}

// Pre-configured empty states (using href instead of onClick for SSR compatibility)
export function EmptyStateNoActions() {
    return (
        <EmptyState
            title="Nenhuma ação pendente"
            description="Crie um orçamento e marque como enviado para iniciar o follow-up automático."
            action={{
                label: "Criar orçamento",
                href: "/quotes/new",
            }}
        />
    );
}

export function EmptyStateNoQuotes() {
    return (
        <EmptyState
            icon={FileText}
            title="Nenhum orçamento encontrado"
            description="Comece por criar o seu primeiro orçamento para acompanhar o follow-up."
            action={{
                label: "Novo orçamento",
                href: "/quotes/new",
            }}
        />
    );
}

export function EmptyStateNoResults() {
    return (
        <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Tente ajustar os filtros ou o termo de pesquisa."
        />
    );
}
