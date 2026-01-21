import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEntitlements } from "@/lib/entitlements";
import { AppHeader, PageHeader } from "@/components/layout";
import { BillingPageClient } from "./billing-page-client";

export default async function BillingPage() {
    const session = await auth();
    if (!session?.user?.organizationId) redirect("/login");

    const organizationId = session.user.organizationId;

    // Get organization with subscription
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
            subscription: {
                include: {
                    plan: true,
                },
            },
        },
    });

    if (!organization) redirect("/login");

    // Get entitlements (single source of truth)
    const entitlements = await getEntitlements(organizationId);

    // Get only PUBLIC plans for display (hides pro_plus, enterprise)
    const plans = await prisma.plan.findMany({
        where: {
            isActive: true,
            isPublic: true,
        },
        orderBy: { priceMonthly: "asc" },
    });

    // Check if current plan is hidden (pro_plus, etc)
    const currentPlanIsHidden = organization.subscription?.plan
        ? !organization.subscription.plan.isPublic
        : false;

    // Transform data for client
    const subscription = organization.subscription;

    const data = {
        organization: {
            id: organization.id,
            trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
        },
        subscription: subscription
            ? {
                  planId: subscription.planId,
                  planName: subscription.plan?.name ?? "Gratuito",
                  status: subscription.status,
                  quotesLimit: subscription.quotesLimit,
                  currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                  hasStripeCustomer: !!subscription.stripeCustomerId,
                  hasStripeSubscription: !!subscription.stripeSubscriptionId,
                  isHiddenPlan: currentPlanIsHidden, // Flag for hidden plans (pro_plus, etc)
              }
            : null,
        entitlements: {
            tier: entitlements.tier,
            planName: entitlements.planName,
            quotesUsed: entitlements.quotesUsed,
            effectivePlanLimit: entitlements.effectivePlanLimit,
            trialDaysRemaining: entitlements.trialDaysRemaining,
            autoEmailEnabled: entitlements.autoEmailEnabled,
            bccInboundEnabled: entitlements.bccInboundEnabled,
            subscriptionStatus: entitlements.subscriptionStatus,
        },
        plans: plans.map((p) => ({
            id: p.id,
            name: p.name,
            quotesLimit: p.monthlyQuoteLimit,
            priceMonthly: p.priceMonthly,
            maxUsers: p.maxUsers,
            hasStripePrice: !!p.stripePriceId,
            // Features based on plan - aligned with landing page pricing
            features:
                p.id === "free"
                    ? [
                          { text: "Cadência e tarefas (manual)", enabled: true },
                          { text: "Templates e scripts", enabled: true },
                          { text: "Emails automáticos", enabled: false },
                          { text: "Captura por BCC", enabled: false },
                      ]
                    : p.id === "starter"
                    ? [
                          { text: "Emails automáticos (D+1, D+3)", enabled: true },
                          { text: "D+7 com chamada guiada + proposta a 1 clique", enabled: true },
                          { text: "Captura de proposta por BCC (PDF/link)", enabled: true },
                          { text: "Templates por etapa", enabled: true },
                          { text: "Scoreboard (rotina e consistência)", enabled: true },
                      ]
                    : p.id === "pro"
                    ? [
                          { text: "Tudo do Starter", enabled: true },
                          { text: "Benchmark por setor", enabled: true },
                          { text: "Relatórios (pipeline, aging, follow-up rate)", enabled: true },
                          { text: "Regras avançadas (prioridade/atribuição)", enabled: true },
                          { text: "Suporte prioritário", enabled: true },
                      ]
                    : [
                          { text: "Utilizadores ilimitados", enabled: true },
                          { text: "Onboarding assistido + migração", enabled: true },
                          { text: "Governance avançada (perfis, auditoria)", enabled: true },
                          { text: "Integrações/API + export avançado", enabled: true },
                          { text: "SLA e suporte dedicado", enabled: true },
                      ],
        })),
    };

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Plano e faturação"
                    description="Veja o seu plano, utilização e faça upgrade quando precisar."
                />

                <BillingPageClient data={data} />
            </main>
        </div>
    );
}
