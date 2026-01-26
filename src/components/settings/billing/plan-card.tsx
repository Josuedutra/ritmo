import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Organization, Subscription } from "@prisma/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface PlanCardProps {
    subscription: Subscription | null;
    organization: Organization;
}

export function PlanCard({ subscription, organization }: PlanCardProps) {
    const isTrial = !!organization.trialEndsAt && new Date(organization.trialEndsAt) > new Date();

    // Determine plan display name
    let planName = "Gratuito";
    if (isTrial) planName = "Trial";
    else if (subscription?.planId) {
        const map = { free: "Gratuito", starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
        planName = map[subscription.planId as keyof typeof map] || subscription.planId;
    }

    // Determine status display
    let statusDisplay = "Ativo";
    let statusColor = "text-green-600";

    if (subscription?.status === "past_due") {
        statusDisplay = "Em atraso";
        statusColor = "text-red-600";
    } else if (subscription?.status === "cancelled") {
        statusDisplay = "Cancelado";
        statusColor = "text-gray-500";
    } else if (isTrial) {
        statusDisplay = `Termina em ${format(new Date(organization.trialEndsAt!), "dd MMM yyyy", { locale: pt })}`;
        statusColor = "text-[var(--color-info-foreground)]";
    }

    // Determine "Includes" text
    let includesText = "5 envios/mês";
    if (isTrial) includesText = "20 envios no trial";
    else if (subscription?.quotesLimit) includesText = `${subscription.quotesLimit} envios/mês`;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plano atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Plano</p>
                        <p className="text-2xl font-bold">{planName}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Estado</p>
                        <p className={`text-lg font-medium ${statusColor}`}>{statusDisplay}</p>
                    </div>
                </div>

                {subscription?.currentPeriodEnd && !isTrial && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Renovação</p>
                        <p>{format(new Date(subscription.currentPeriodEnd), "dd MMM yyyy", { locale: pt })}</p>
                    </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{includesText}</span>
                </div>
            </CardContent>
        </Card>
    );
}
