/**
 * Priority Rules Engine
 *
 * Calculates priority for quotes/events based on org settings.
 *
 * Pro plans: Custom threshold and priority tags
 * Starter plans: Fixed threshold of 1000€
 * Free plans: Fixed threshold of 1000€
 */

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export interface PriorityRules {
    threshold: number;
    tags: string[];
}

// Default rules for non-Pro plans
const DEFAULT_PRIORITY_RULES: PriorityRules = {
    threshold: 1000,
    tags: [],
};

/**
 * Get priority rules for an organization.
 * Pro orgs get their custom rules; others get defaults.
 */
export async function getOrgPriorityRules(organizationId: string): Promise<PriorityRules> {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            priorityThreshold: true,
            priorityTags: true,
            subscription: {
                select: {
                    planId: true,
                    status: true,
                },
            },
        },
    });

    if (!org) {
        return DEFAULT_PRIORITY_RULES;
    }

    // Only Pro and Enterprise can use custom rules
    const canUseCustomRules = org.subscription &&
        (org.subscription.status === "active" || org.subscription.status === "trialing") &&
        ["pro", "enterprise"].includes(org.subscription.planId);

    if (!canUseCustomRules) {
        return DEFAULT_PRIORITY_RULES;
    }

    return {
        threshold: org.priorityThreshold?.toNumber() ?? DEFAULT_PRIORITY_RULES.threshold,
        tags: org.priorityTags ?? DEFAULT_PRIORITY_RULES.tags,
    };
}

/**
 * Calculate priority for a quote based on value and tags.
 */
export function calculatePriority(
    value: Decimal | number | null | undefined,
    tags: string[] | undefined,
    rules: PriorityRules
): "HIGH" | "LOW" {
    // Check value threshold
    const numericValue = value instanceof Decimal ? value.toNumber() : (value ?? 0);
    if (numericValue >= rules.threshold) {
        return "HIGH";
    }

    // Check priority tags
    if (tags && tags.length > 0 && rules.tags.length > 0) {
        const hasHighPriorityTag = tags.some((tag) =>
            rules.tags.some((priorityTag) =>
                tag.toLowerCase() === priorityTag.toLowerCase()
            )
        );
        if (hasHighPriorityTag) {
            return "HIGH";
        }
    }

    return "LOW";
}

/**
 * Calculate priority for a quote by ID (fetches quote data).
 */
export async function calculateQuotePriority(
    quoteId: string,
    organizationId: string
): Promise<"HIGH" | "LOW"> {
    const [quote, rules] = await Promise.all([
        prisma.quote.findUnique({
            where: { id: quoteId },
            select: {
                value: true,
                tags: true,
            },
        }),
        getOrgPriorityRules(organizationId),
    ]);

    if (!quote) {
        return "LOW";
    }

    return calculatePriority(quote.value, quote.tags, rules);
}
