import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;

                // Find user with organization
                const user = await prisma.user.findFirst({
                    where: { email },
                    include: { organization: true },
                });

                if (!user || !user.passwordHash) {
                    return null;
                }

                // TODO: Sprint 1 - Add proper password hashing with bcrypt
                // For now, simple comparison for dev
                const isValid = user.passwordHash === credentials.password;

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
