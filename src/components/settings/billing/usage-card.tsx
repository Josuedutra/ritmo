import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Organization, Subscription, UsageCounter } from "@prisma/client";
import { differenceInDays } from "date-fns";

interface UsageCardProps {
    organization: Organization;
    subscription: Subscription | null;
    usage: UsageCounter | null;
}

export function UsageCard({ organization, subscription, usage }: UsageCardProps) {
    const isTrial = !!organization.trialEndsAt && new Date(organization.trialEndsAt) > new Date();

    let used = 0;
    let limit = 5;

    if (isTrial) {
        used = organization.trialSentUsed;
        limit = organization.trialSentLimit;
    } else if (subscription) {
        used = usage?.quotesSent ?? 0;
        limit = subscription.quotesLimit;
    } else {
        used = usage?.quotesSent ?? 0;
        limit = 5;
    }

    const percentage = Math.min(100, Math.max(0, (used / limit) * 100));

    // Status Logic
    let barColor = "bg-primary";
    let statusText = "";

    if (percentage >= 90) {
        barColor = "bg-red-600";
        statusText = "Limite a atingir";
    } else if (percentage >= 70) {
        barColor = "bg-yellow-500";
        statusText = "A aproximar-se do limite";
    }

    // CTA Logic
    let cta = null;
    if (subscription?.status === "past_due") {
        cta = <Button variant="destructive" className="w-full">Atualizar pagamento</Button>;
    } else if (subscription?.status === "cancelled") {
        cta = <Button variant="outline" className="w-full">Reativar plano</Button>;
    } else if (isTrial || !subscription || subscription.planId === 'free') {
        cta = <Button className="w-full">Atualizar plano</Button>;
    }

    // Helper text
    let helperText = "";
    if (isTrial && organization.trialEndsAt) {
        const daysLeft = differenceInDays(new Date(organization.trialEndsAt), new Date());
        helperText = ` · faltam ${daysLeft} dias`;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Utilização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">
                            {used} / {limit} envios{helperText}
                        </span>
                        <span className={`font-bold ${percentage >= 90 ? 'text-red-600' : ''}`}>
                            {statusText}
                        </span>
                    </div>
                    <Progress value={percentage} className={`h-2 ${barColor}`} />
                </div>

                {cta}
            </CardContent>
        </Card>
    );
}
