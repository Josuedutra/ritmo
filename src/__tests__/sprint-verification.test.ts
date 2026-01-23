/**
 * Sprint 0 & 1 Verification Tests
 *
 * Este ficheiro verifica se os itens dos sprints 0 e 1 estão implementados.
 * Executa verificações estruturais do código (não são testes de integração).
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../..");

// Helper para verificar se ficheiro existe
function fileExists(relativePath: string): boolean {
    return fs.existsSync(path.join(ROOT, relativePath));
}

// Helper para ler conteúdo de ficheiro
function readFile(relativePath: string): string {
    const fullPath = path.join(ROOT, relativePath);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf-8");
}

// ============================================================================
// SPRINT 0: Setup (Dias 1-2)
// ============================================================================

describe("Sprint 0: Setup", () => {
    describe("Monorepo Next.js", () => {
        it("deve ter package.json com Next.js 14+", () => {
            const pkg = JSON.parse(readFile("package.json"));
            expect(pkg.dependencies.next).toBeDefined();
            // Next.js versão 14+ (ou 15+, 16+)
            const version = pkg.dependencies.next.replace(/[\^~]/, "");
            const major = parseInt(version.split(".")[0]);
            expect(major).toBeGreaterThanOrEqual(14);
        });

        it("deve ter estrutura App Router", () => {
            expect(fileExists("src/app/page.tsx")).toBe(true);
            expect(fileExists("src/app/layout.tsx")).toBe(true);
        });

        it("deve ter TypeScript configurado", () => {
            expect(fileExists("tsconfig.json")).toBe(true);
            const tsconfig = JSON.parse(readFile("tsconfig.json"));
            expect(tsconfig.compilerOptions.strict).toBe(true);
        });
    });

    describe("Neon DB + Prisma", () => {
        it("deve ter Prisma instalado", () => {
            const pkg = JSON.parse(readFile("package.json"));
            expect(pkg.dependencies["@prisma/client"]).toBeDefined();
            expect(pkg.devDependencies.prisma).toBeDefined();
        });

        it("deve ter schema.prisma configurado para PostgreSQL", () => {
            expect(fileExists("prisma/schema.prisma")).toBe(true);
            const schema = readFile("prisma/schema.prisma");
            expect(schema).toContain('provider = "postgresql"');
            expect(schema).toContain('env("DATABASE_URL")');
        });

        it("deve ter lib/prisma.ts para singleton", () => {
            expect(fileExists("src/lib/prisma.ts")).toBe(true);
            const prismaLib = readFile("src/lib/prisma.ts");
            expect(prismaLib).toContain("PrismaClient");
        });

        it("deve ter scripts de DB no package.json", () => {
            const pkg = JSON.parse(readFile("package.json"));
            expect(pkg.scripts["db:push"]).toBeDefined();
            expect(pkg.scripts["db:migrate"]).toBeDefined();
            expect(pkg.scripts["db:studio"]).toBeDefined();
        });
    });

    describe("NextAuth.js v5", () => {
        it("deve ter next-auth v5 (beta) instalado", () => {
            const pkg = JSON.parse(readFile("package.json"));
            expect(pkg.dependencies["next-auth"]).toBeDefined();
            expect(pkg.dependencies["next-auth"]).toContain("5.");
        });

        it("deve ter @auth/prisma-adapter instalado", () => {
            const pkg = JSON.parse(readFile("package.json"));
            expect(pkg.dependencies["@auth/prisma-adapter"]).toBeDefined();
        });

        it("deve ter auth.ts configurado", () => {
            expect(fileExists("src/lib/auth.ts")).toBe(true);
            const auth = readFile("src/lib/auth.ts");
            expect(auth).toContain("NextAuth");
            expect(auth).toContain("PrismaAdapter");
        });

        it("deve ter auth.config.ts para edge runtime", () => {
            expect(fileExists("src/lib/auth.config.ts")).toBe(true);
        });

        it("deve ter middleware.ts para proteção de rotas", () => {
            expect(fileExists("src/middleware.ts")).toBe(true);
            const middleware = readFile("src/middleware.ts");
            expect(middleware).toContain("auth");
        });

        it("deve ter route handler para [...nextauth]", () => {
            expect(fileExists("src/app/api/auth/[...nextauth]/route.ts")).toBe(true);
        });
    });

    describe("Deploy Vercel", () => {
        it("deve ter vercel.json configurado", () => {
            expect(fileExists("vercel.json")).toBe(true);
        });

        it("deve ter cron job configurado em vercel.json", () => {
            const vercel = JSON.parse(readFile("vercel.json"));
            expect(vercel.crons).toBeDefined();
            expect(vercel.crons.length).toBeGreaterThan(0);
            expect(vercel.crons[0].path).toBe("/api/cron/process-cadence");
        });

        it("deve ter headers de segurança", () => {
            const vercel = JSON.parse(readFile("vercel.json"));
            expect(vercel.headers).toBeDefined();
        });
    });

    describe("Stripe (test mode)", () => {
        it("deve ter stripe instalado", () => {
            const pkg = JSON.parse(readFile("package.json"));
            expect(pkg.dependencies.stripe).toBeDefined();
        });

        it("deve ter lib/stripe.ts configurado", () => {
            expect(fileExists("src/lib/stripe.ts")).toBe(true);
            const stripe = readFile("src/lib/stripe.ts");
            expect(stripe).toContain("STRIPE_SECRET_KEY");
            expect(stripe).toContain("PLANS");
        });

        it("deve ter planos definidos (free, starter, pro, enterprise)", () => {
            const stripe = readFile("src/lib/stripe.ts");
            expect(stripe).toContain("free");
            expect(stripe).toContain("starter");
            expect(stripe).toContain("pro");
            expect(stripe).toContain("enterprise");
        });

        it("deve ter webhook endpoint", () => {
            expect(fileExists("src/app/api/webhooks/stripe/route.ts")).toBe(true);
        });

        it("deve ter .env.example com variáveis do Stripe", () => {
            const env = readFile(".env.example");
            expect(env).toContain("STRIPE_SECRET_KEY");
            expect(env).toContain("STRIPE_WEBHOOK_SECRET");
        });
    });

    describe("Resend (sandbox)", () => {
        it("deve ter resend instalado", () => {
            const pkg = JSON.parse(readFile("package.json"));
            expect(pkg.dependencies.resend).toBeDefined();
        });

        it("deve ter lib/email.ts configurado", () => {
            expect(fileExists("src/lib/email.ts")).toBe(true);
            const email = readFile("src/lib/email.ts");
            expect(email).toContain("Resend");
            expect(email).toContain("RESEND_API_KEY");
        });

        it("deve ter modo sandbox/stub para dev", () => {
            const email = readFile("src/lib/email.ts");
            expect(email).toContain("STUB");
        });

        it("deve ter .env.example com variáveis do Resend", () => {
            const env = readFile(".env.example");
            expect(env).toContain("RESEND_API_KEY");
            expect(env).toContain("EMAIL_FROM");
        });
    });
});

// ============================================================================
// SPRINT 1: Core (Dias 3-10) - GATES
// ============================================================================

describe("Sprint 1: Core - Gates", () => {
    describe("Gate 1: API CRUD", () => {
        describe("Contacts API", () => {
            it("deve ter GET/POST /api/contacts", () => {
                expect(fileExists("src/app/api/contacts/route.ts")).toBe(true);
                const content = readFile("src/app/api/contacts/route.ts");
                expect(content).toContain("export async function GET");
                expect(content).toContain("export async function POST");
            });

            it("deve ter GET/PUT/DELETE /api/contacts/[id]", () => {
                expect(fileExists("src/app/api/contacts/[id]/route.ts")).toBe(true);
                const content = readFile("src/app/api/contacts/[id]/route.ts");
                expect(content).toContain("export async function GET");
                expect(content).toContain("export async function PUT");
                expect(content).toContain("export async function DELETE");
            });

            it("deve ter scoping por organizationId", () => {
                const content = readFile("src/app/api/contacts/route.ts");
                expect(content).toContain("organizationId");
                expect(content).toContain("session.user.organizationId");
            });
        });

        describe("Quotes API", () => {
            it("deve ter GET/POST /api/quotes", () => {
                expect(fileExists("src/app/api/quotes/route.ts")).toBe(true);
                const content = readFile("src/app/api/quotes/route.ts");
                expect(content).toContain("export async function GET");
                expect(content).toContain("export async function POST");
            });

            it("deve ter GET/PUT/DELETE /api/quotes/[id]", () => {
                expect(fileExists("src/app/api/quotes/[id]/route.ts")).toBe(true);
                const content = readFile("src/app/api/quotes/[id]/route.ts");
                expect(content).toContain("export async function GET");
                expect(content).toContain("export async function PUT");
                expect(content).toContain("export async function DELETE");
            });

            it("deve ter scoping por organizationId", () => {
                const content = readFile("src/app/api/quotes/route.ts");
                expect(content).toContain("organizationId");
                expect(content).toContain("session.user.organizationId");
            });
        });

        describe("Tasks API", () => {
            it("deve ter GET/POST /api/tasks", () => {
                expect(fileExists("src/app/api/tasks/route.ts")).toBe(true);
                const content = readFile("src/app/api/tasks/route.ts");
                expect(content).toContain("export async function GET");
                expect(content).toContain("export async function POST");
            });

            it("deve ter GET/PUT/DELETE /api/tasks/[id]", () => {
                expect(fileExists("src/app/api/tasks/[id]/route.ts")).toBe(true);
                const content = readFile("src/app/api/tasks/[id]/route.ts");
                expect(content).toContain("export async function GET");
                expect(content).toContain("export async function PUT");
                expect(content).toContain("export async function DELETE");
            });

            it("deve ter POST /api/tasks/[id]/complete", () => {
                expect(fileExists("src/app/api/tasks/[id]/complete/route.ts")).toBe(true);
                const content = readFile("src/app/api/tasks/[id]/complete/route.ts");
                expect(content).toContain("export async function POST");
                expect(content).toContain("completed");
            });
        });
    });

    describe("Gate 2: Trigger D0 → Cadência", () => {
        it("deve ter POST /api/quotes/[id]/mark-sent", () => {
            expect(fileExists("src/app/api/quotes/[id]/mark-sent/route.ts")).toBe(true);
            const content = readFile("src/app/api/quotes/[id]/mark-sent/route.ts");
            expect(content).toContain("export async function POST");
        });

        it("deve definir firstSentAt na primeira vez", () => {
            const content = readFile("src/app/api/quotes/[id]/mark-sent/route.ts");
            expect(content).toContain("firstSentAt");
            expect(content).toContain("isFirstSend");
        });

        it("deve incrementar cadenceRunId", () => {
            const cadence = readFile("src/lib/cadence.ts");
            expect(cadence).toContain("cadenceRunId");
            expect(cadence).toContain("newRunId");
        });

        it("deve criar 4 cadence_events (D+1, D+3, D+7, D+14)", () => {
            const cadence = readFile("src/lib/cadence.ts");
            expect(cadence).toContain("email_d1");
            expect(cadence).toContain("email_d3");
            expect(cadence).toContain("call_d7");
            expect(cadence).toContain("email_d14");
            expect(cadence).toContain("CADENCE_SCHEDULE");
        });

        it("deve usar addBusinessDays para calcular datas", () => {
            const cadence = readFile("src/lib/cadence.ts");
            expect(cadence).toContain("addBusinessDays");
        });

        it("deve aplicar regra A/B (>=1000 → HIGH priority)", () => {
            const cadence = readFile("src/lib/cadence.ts");
            expect(cadence).toContain("HIGH_VALUE_THRESHOLD");
            expect(cadence).toContain("1000");
            expect(cadence).toContain("callPriority");
        });

        it("deve cancelar eventos antigos em reenvio", () => {
            const cadence = readFile("src/lib/cadence.ts");
            expect(cadence).toContain("cancelled");
            expect(cadence).toContain("resent");
        });
    });

    describe("Gate 3: APIs Dashboard", () => {
        it("deve ter GET /api/actions/today", () => {
            expect(fileExists("src/app/api/actions/today/route.ts")).toBe(true);
            const content = readFile("src/app/api/actions/today/route.ts");
            expect(content).toContain("export async function GET");
            expect(content).toContain("todayStart");
            expect(content).toContain("todayEnd");
        });

        it("deve retornar eventos e tasks de hoje", () => {
            const content = readFile("src/app/api/actions/today/route.ts");
            expect(content).toContain("cadenceEvents");
            expect(content).toContain("tasks");
            expect(content).toContain("emails");
            expect(content).toContain("calls");
        });

        it("deve ter GET /api/quotes/no-response", () => {
            expect(fileExists("src/app/api/quotes/no-response/route.ts")).toBe(true);
            const content = readFile("src/app/api/quotes/no-response/route.ts");
            expect(content).toContain("export async function GET");
        });

        it("deve identificar quotes sem próxima ação", () => {
            const content = readFile("src/app/api/quotes/no-response/route.ts");
            expect(content).toContain("completed");
            expect(content).toContain("scheduled");
            expect(content).toContain("daysSinceSent");
        });

        it("deve ter GET /api/dashboard/stats", () => {
            expect(fileExists("src/app/api/dashboard/stats/route.ts")).toBe(true);
            const content = readFile("src/app/api/dashboard/stats/route.ts");
            expect(content).toContain("actionsToday");
            expect(content).toContain("pipelineValue");
        });
    });

    describe("Gate 4: Cron Idempotente TASK-EMAIL", () => {
        const cronContent = readFile("src/app/api/cron/process-cadence/route.ts");

        it("não deve ser mais um STUB", () => {
            expect(cronContent).not.toContain('message: "STUB');
        });

        it("deve ter claim transacional", () => {
            expect(cronContent).toContain("claimed");
            expect(cronContent).toContain("claimedAt");
            expect(cronContent).toContain("claimedBy");
        });

        it("deve liberar orphan claims", () => {
            expect(cronContent).toContain("CLAIM_TIMEOUT_MINUTES");
            expect(cronContent).toContain("orphan");
        });

        it("deve usar FOR UPDATE SKIP LOCKED", () => {
            expect(cronContent).toContain("FOR UPDATE SKIP LOCKED");
        });

        it("deve criar tasks para eventos", () => {
            expect(cronContent).toContain("prisma.task.create");
            expect(cronContent).toContain("tasksCreated");
        });

        it("deve cancelar eventos se quote mudou de status", () => {
            expect(cronContent).toContain("status_changed");
            expect(cronContent).toContain("won");
            expect(cronContent).toContain("lost");
            expect(cronContent).toContain("negotiation");
        });

        it("deve pular eventos se contacto não tem email", () => {
            expect(cronContent).toContain("no_email");
            expect(cronContent).toContain("skipped");
        });

        it("deve atualizar ritmoStage do quote", () => {
            expect(cronContent).toContain("updateQuoteRitmoStage");
            expect(cronContent).toContain("fup_d3");
            expect(cronContent).toContain("fup_d7");
            expect(cronContent).toContain("fup_d14");
        });
    });

    describe("Dashboard com Dados Reais", () => {
        const dashboard = readFile("src/app/dashboard/page.tsx");

        it("deve buscar dados reais do DB", () => {
            expect(dashboard).toContain("prisma");
            expect(dashboard).toContain("getDashboardData");
        });

        it("deve mostrar ações de hoje", () => {
            expect(dashboard).toContain("todayEvents");
            expect(dashboard).toContain("todayTasks");
        });

        it("deve calcular pipeline value", () => {
            expect(dashboard).toContain("pipelineValue");
            expect(dashboard).toContain("_sum");
        });

        it("deve mostrar usage do plano", () => {
            expect(dashboard).toContain("UsageMeter");
            expect(dashboard).toContain("entitlements");
        });

        it("deve ter componente ActionsList", () => {
            expect(dashboard).toContain("ActionsList");
        });
    });
});

// ============================================================================
// SPRINT 1: Core - Schema e Utils
// ============================================================================

describe("Sprint 1: Core - Schema e Utils", () => {
    describe("Schema Prisma completo", () => {
        const schema = readFile("prisma/schema.prisma");

        it("deve ter model Organization", () => {
            expect(schema).toContain("model Organization");
            expect(schema).toContain("timezone");
            expect(schema).toContain("valueThreshold");
        });

        it("deve ter model User com role", () => {
            expect(schema).toContain("model User");
            expect(schema).toContain("UserRole");
        });

        it("deve ter model Contact (email opcional)", () => {
            expect(schema).toContain("model Contact");
            expect(schema).toContain("email           String?");
        });

        it("deve ter model Quote com businessStatus e ritmoStage", () => {
            expect(schema).toContain("model Quote");
            expect(schema).toContain("BusinessStatus");
            expect(schema).toContain("RitmoStage");
        });

        it("deve ter model CadenceEvent com claim transacional", () => {
            expect(schema).toContain("model CadenceEvent");
            expect(schema).toContain("claimedAt");
            expect(schema).toContain("claimedBy");
        });

        it("deve ter model Task", () => {
            expect(schema).toContain("model Task");
            expect(schema).toContain("TaskStatus");
        });
    });

    describe("Lógica addBusinessDays", () => {
        const bd = readFile("src/lib/business-days.ts");

        it("deve ter função addBusinessDays", () => {
            expect(bd).toContain("export function addBusinessDays");
        });

        it("deve ter função isBusinessDay", () => {
            expect(bd).toContain("export function isBusinessDay");
        });

        it("deve considerar feriados portugueses", () => {
            expect(bd).toContain("FIXED_HOLIDAYS");
            expect(bd).toContain("Natal");
        });

        it("deve usar timezone Europe/Lisbon", () => {
            expect(bd).toContain("Europe/Lisbon");
        });
    });

    describe("Lib Cadence", () => {
        it("deve ter lib/cadence.ts", () => {
            expect(fileExists("src/lib/cadence.ts")).toBe(true);
        });

        it("deve ter função generateCadenceEvents", () => {
            const cadence = readFile("src/lib/cadence.ts");
            expect(cadence).toContain("export async function generateCadenceEvents");
        });

        it("deve ter função cancelPendingCadence", () => {
            const cadence = readFile("src/lib/cadence.ts");
            expect(cadence).toContain("export async function cancelPendingCadence");
        });
    });

    describe("API Utils", () => {
        it("deve ter lib/api-utils.ts", () => {
            expect(fileExists("src/lib/api-utils.ts")).toBe(true);
        });

        it("deve ter funções helper para respostas", () => {
            const utils = readFile("src/lib/api-utils.ts");
            expect(utils).toContain("getApiSession");
            expect(utils).toContain("unauthorized");
            expect(utils).toContain("notFound");
            expect(utils).toContain("badRequest");
            expect(utils).toContain("serverError");
            expect(utils).toContain("success");
        });
    });
});
