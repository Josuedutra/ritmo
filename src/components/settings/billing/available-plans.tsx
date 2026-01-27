import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface Plan {
    id: string;
    name: string;
    price: string;
    limit: string;
    features: string[];
}

const PLANS: Plan[] = [
    {
        id: "free",
        name: "Gratuito",
        price: "€0/mês",
        limit: "10 envios/mês",
        features: ["Cadência e tarefas (manual)", "Templates e scripts"],
    },
    {
        id: "starter",
        name: "Starter",
        price: "€39/mês",
        limit: "80 envios/mês",
        features: ["Emails automáticos (D+1, D+3)", "Captura por BCC", "Até 2 utilizadores"],
    },
    {
        id: "pro",
        name: "Pro",
        price: "€99/mês",
        limit: "250 envios/mês",
        features: ["Tudo do Starter", "Benchmark por setor", "Até 5 utilizadores"],
    },
];

interface AvailablePlansProps {
    hasStripeCustomer: boolean;
    currentPlanId?: string;
}

export function AvailablePlans({ hasStripeCustomer, currentPlanId }: AvailablePlansProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
            {PLANS.map((plan) => (
                <Card key={plan.id} className={currentPlanId === plan.id ? "border-primary border-2" : ""}>
                    <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <div className="mt-2">
                            <span className="text-3xl font-bold">{plan.price}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.limit}</p>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center">
                                    <Check className="mr-2 h-4 w-4 text-green-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        {hasStripeCustomer ? (
                            <Button className="w-full" variant="outline">
                                Gerir subscrição
                            </Button>
                        ) : (
                            <Button className="w-full" variant={currentPlanId === plan.id ? "secondary" : "default"}>
                                {currentPlanId === plan.id ? "Plano Atual" : "Escolher plano"}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
