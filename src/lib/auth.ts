import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { TRIAL_LIMIT, TRIAL_DURATION_DAYS } from "@/lib/entitlements";
import { trackEvent, ProductEventNames } from "@/lib/product-events";
import { logger } from "@/lib/logger";
import { authenticatePassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // P0-lite: Only allow linking if we verify email_verified in signIn callback
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("[Auth] authorize called with:", credentials?.email);

                if (!credentials?.email || !credentials?.password) {
                    console.log("[Auth] Missing email or password");
                    return null;
                }

                const email = credentials.email as string;

                // Find user with organization
                const user = await prisma.user.findFirst({
                    where: { email },
                    include: { organization: true },
                });

                console.log("[Auth] User found:", user ? user.email : "null");

                if (!user || !user.passwordHash) {
                    console.log("[Auth] User not found or no passwordHash");
                    return null;
                }

                // Authenticate with bcrypt (handles legacy plaintext upgrade)
                const password = credentials.password as string;
                const isValid = await authenticatePassword(
                    password,
                    user.passwordHash,
                    user.id
                );
                console.log("[Auth] Password valid:", isValid);

                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    organizationId: user.organizationId,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        /**
         * P0-lite 1: Block OAuth login if email is not verified
         * This is critical when using allowDangerousEmailAccountLinking
         */
        async signIn({ user, account, profile }) {
            // Only apply to OAuth providers (not credentials)
            if (account?.provider === "google") {
                // Google provides email_verified in the profile
                const emailVerified = (profile as { email_verified?: boolean })?.email_verified;

                if (!emailVerified) {
                    logger.warn(
                        { email: user.email, provider: account.provider, scope: "oauth" },
                        "OAuth login blocked: email_verified is false"
                    );
                    trackEvent(ProductEventNames.OAUTH_EMAIL_NOT_VERIFIED, {
                        props: {
                            email: user.email,
                            provider: account.provider,
                        },
                    });
                    // Return false to block sign-in
                    return false;
                }
            }
            return true;
        },
        /**
         * Session callback with Prisma access (server-side only, not Edge)
         * Enriches session with organizationId for OAuth users
         */
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = (token.role as string) || "admin";

                // For OAuth users, organizationId might not be in token yet
                if (token.organizationId) {
                    session.user.organizationId = token.organizationId as string;
                } else if (token.id) {
                    // Lazy load organizationId from database for OAuth users
                    const user = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { organizationId: true, role: true },
                    });
                    if (user?.organizationId) {
                        session.user.organizationId = user.organizationId;
                        session.user.role = user.role;
                        // Update token for future requests
                        token.organizationId = user.organizationId;
                        token.role = user.role;
                    }
                }
            }
            return session;
        },
    },
    events: {
        /**
         * Handle new user creation from OAuth (Google).
         * Creates organization with trial defaults if user doesn't have one.
         * P0-lite 2: Uses transaction to ensure idempotency and atomicity
         */
        async createUser({ user }) {
            logger.info({ email: user.email, scope: "oauth" }, "createUser event - new OAuth user");

            if (!user.id || !user.email) return;

            // Use transaction for atomicity - prevents duplicate orgs on retries
            try {
                await prisma.$transaction(async (tx) => {
                    // Check if user already has an organization (idempotency check)
                    const existingUser = await tx.user.findUnique({
                        where: { id: user.id },
                        select: { organizationId: true },
                    });

                    if (existingUser?.organizationId) {
                        logger.info(
                            { userId: user.id, organizationId: existingUser.organizationId, scope: "oauth" },
                            "User already has organization, skipping auto-provision"
                        );
                        return; // Already has org, skip creation
                    }

                    // Create organization for new OAuth user
                    const email = user.email!;
                    const name = user.name || email.split("@")[0];

                    // Generate unique slug
                    const baseSlug = name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "");

                    let slug = baseSlug;
                    let counter = 1;
                    while (await tx.organization.findUnique({ where: { slug } })) {
                        slug = `${baseSlug}-${counter}`;
                        counter++;
                    }

                    // Calculate trial end date
                    const trialEndsAt = new Date();
                    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

                    // Create organization with trial defaults
                    const organization = await tx.organization.create({
                        data: {
                            name: `Empresa de ${name}`,
                            slug,
                            trialEndsAt,
                            trialSentLimit: TRIAL_LIMIT,
                            trialSentUsed: 0,
                            autoEmailEnabled: true,
                            bccInboundEnabled: true,
                            onboardingCompleted: false,
                            onboardingState: {
                                templates: false,
                                smtp: false,
                                bcc: false,
                                firstQuote: false,
                            },
                        },
                    });

                    // Link user to organization (atomic with org creation)
                    await tx.user.update({
                        where: { id: user.id },
                        data: {
                            organizationId: organization.id,
                            role: "admin",
                        },
                    });

                    logger.info(
                        { userId: user.id, organizationId: organization.id, slug, scope: "oauth" },
                        "Created organization for OAuth user"
                    );

                    // Track signup event (outside transaction is fine - analytics)
                    trackEvent(ProductEventNames.SIGNUP_COMPLETED, {
                        organizationId: organization.id,
                        userId: user.id,
                        props: {
                            provider: "google",
                            trialDays: TRIAL_DURATION_DAYS,
                        },
                    });
                });
            } catch (error) {
                // Log but don't throw - user is already created, org creation can be retried
                logger.error(
                    { error, userId: user.id, email: user.email, scope: "oauth" },
                    "Failed to auto-provision organization for OAuth user"
                );
            }
        },
    },
});

// Type augmentation for session
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            organizationId: string;
            role: string;
        };
    }

    interface User {
        organizationId?: string;
        role?: string;
    }
}
