/**
 * Smart Upgrade CTA Helper (P1.1)
 *
 * Handles upgrade actions intelligently:
 * - Portal for existing Stripe customers
 * - Checkout for new customers
 * - Contact for Pro+ (hidden plan)
 */

import type { UpgradeReason } from "@/components/billing/upgrade-prompt";

export type RecommendedPlan = "starter" | "pro" | "pro_plus";
export type CtaActionType = "portal" | "checkout" | "contact" | "fallback";

interface CtaResult {
    type: CtaActionType;
    url?: string;
    error?: string;
}

/**
 * Get recommended plan based on upgrade reason and current plan
 */
export function getRecommendedPlan(
    reason: UpgradeReason,
    currentPlan?: string | null
): RecommendedPlan {
    // If already on Pro and hitting limits, recommend Pro+
    if (currentPlan === "pro") {
        if (reason === "send_limit" || reason === "storage_quota") {
            return "pro_plus";
        }
    }

    // Specific recommendations by reason
    switch (reason) {
        case "send_limit":
            return "pro";
        case "storage_quota":
            return "pro";
        case "retention_expired":
            // If on starter, recommend pro for 12-month retention
            return currentPlan === "starter" ? "pro" : "starter";
        case "seat_limit":
            return "pro";
        case "benchmark_locked":
            // Benchmark is Pro+ exclusive
            return "pro_plus";
        default:
            return "pro";
    }
}

/**
 * Build mailto URL for Pro+ contact
 */
function buildContactUrl(organizationId?: string): string {
    const subject = encodeURIComponent("Pedido Pro+");
    const body = encodeURIComponent(
        `Olá,\n\nGostaria de saber mais sobre o plano Pro+.\n\nOrganização: ${organizationId || "N/A"}\n\nObrigado!`
    );
    return `mailto:ritmo@useritmo.pt?subject=${subject}&body=${body}`;
}

/**
 * Execute the upgrade CTA action
 *
 * Returns the action type and URL to redirect to.
 * The component should handle the redirect.
 */
export async function runUpgradeCta(params: {
    reason: UpgradeReason;
    currentPlan?: string | null;
    organizationId?: string;
}): Promise<CtaResult> {
    const { reason, currentPlan, organizationId } = params;
    const recommendedPlan = getRecommendedPlan(reason, currentPlan);

    // Pro+ is contact-only (hidden plan)
    if (recommendedPlan === "pro_plus") {
        return {
            type: "contact",
            url: buildContactUrl(organizationId),
        };
    }

    try {
        // Try portal first (for existing Stripe customers)
        const portalResponse = await fetch("/api/billing/portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        if (portalResponse.ok) {
            const data = await portalResponse.json();
            if (data.url) {
                return {
                    type: "portal",
                    url: data.url,
                };
            }
        }

        // Check if we need to go to checkout instead
        if (portalResponse.status === 400) {
            const errorData = await portalResponse.json();

            // action: "choose_plan" means no Stripe customer yet
            if (errorData.action === "choose_plan") {
                // Try checkout for the recommended plan
                const checkoutResponse = await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ planKey: recommendedPlan }),
                });

                if (checkoutResponse.ok) {
                    const checkoutData = await checkoutResponse.json();
                    if (checkoutData.url) {
                        return {
                            type: "checkout",
                            url: checkoutData.url,
                        };
                    }
                }

                // Checkout also failed - check if plan is hidden
                if (checkoutResponse.status === 400) {
                    const checkoutError = await checkoutResponse.json();
                    if (checkoutError.error === "PLAN_NOT_PUBLIC") {
                        // Plan is hidden, redirect to contact
                        return {
                            type: "contact",
                            url: buildContactUrl(organizationId),
                        };
                    }
                }
            }
        }

        // Fallback to billing page
        return {
            type: "fallback",
            url: "/settings/billing",
        };
    } catch (error) {
        // Network error - fallback to billing page
        return {
            type: "fallback",
            url: "/settings/billing",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
