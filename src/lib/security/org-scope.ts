/**
 * Organization Scope Guard (P0 Security Hardening)
 *
 * Ensures all data access is scoped to the user's organization.
 * Prevents IDOR (Insecure Direct Object Reference) vulnerabilities.
 *
 * Usage:
 * ```ts
 * const session = await getApiSession();
 * if (!session) return unauthorized();
 *
 * const orgId = requireOrgId(session);
 *
 * // For entity access:
 * const quote = await prisma.quote.findUnique({ ... });
 * assertOrgMatch(quote?.organizationId, orgId);
 * ```
 */

import { ApiSession } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const log = logger.child({ service: "org-scope" });

/**
 * Security error thrown when org scope is violated
 */
export class OrgScopeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OrgScopeError";
    }
}

/**
 * Extract and validate organizationId from session.
 * Throws if session or orgId is missing.
 *
 * @param session - The authenticated API session
 * @returns The organization ID
 * @throws OrgScopeError if session or orgId is missing
 */
export function requireOrgId(session: ApiSession | null): string {
    if (!session) {
        throw new OrgScopeError("Session required");
    }

    if (!session.user.organizationId) {
        log.error({ userId: session.user.id }, "User has no organizationId");
        throw new OrgScopeError("Organization required");
    }

    return session.user.organizationId;
}

/**
 * Assert that an entity belongs to the user's organization.
 * Use after fetching an entity to verify ownership.
 *
 * @param entityOrgId - The organizationId of the entity (can be null/undefined if entity not found)
 * @param sessionOrgId - The user's organizationId from session
 * @param entityType - Optional entity type for error message (default: "Resource")
 * @throws OrgScopeError if orgIds don't match
 */
export function assertOrgMatch(
    entityOrgId: string | null | undefined,
    sessionOrgId: string,
    entityType = "Resource"
): void {
    if (!entityOrgId) {
        throw new OrgScopeError(`${entityType} not found`);
    }

    if (entityOrgId !== sessionOrgId) {
        log.warn(
            {
                entityOrgId,
                sessionOrgId,
                entityType,
            },
            "Org scope violation attempt"
        );
        // Don't reveal that the resource exists but belongs to another org
        throw new OrgScopeError(`${entityType} not found`);
    }
}

/**
 * Build a Prisma where clause that includes org scope.
 * Useful for queries where you want to ensure org filtering.
 *
 * @param sessionOrgId - The user's organizationId from session
 * @param additionalWhere - Additional where conditions
 * @returns Where clause with organizationId included
 */
export function withOrgScope<T extends Record<string, unknown>>(
    sessionOrgId: string,
    additionalWhere: T = {} as T
): T & { organizationId: string } {
    return {
        ...additionalWhere,
        organizationId: sessionOrgId,
    };
}

/**
 * Type guard to check if an entity has organizationId
 */
export function hasOrgId(
    entity: unknown
): entity is { organizationId: string } {
    return (
        typeof entity === "object" &&
        entity !== null &&
        "organizationId" in entity &&
        typeof (entity as { organizationId: unknown }).organizationId === "string"
    );
}
