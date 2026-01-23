/**
 * E2E Test: Complete Cadence Flow
 *
 * Tests the full flow:
 * mark-sent → generates 4 events → cron processes → creates tasks → today actions
 *
 * This is a structural test that validates the code paths exist and are connected.
 * For actual integration tests, you would need a test database.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../..");

function readFile(relativePath: string): string {
    const fullPath = path.join(ROOT, relativePath);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf-8");
}

describe("E2E: Cadence Flow", () => {
    describe("Step 1: mark-sent endpoint", () => {
        const markSentContent = readFile("src/app/api/quotes/[id]/mark-sent/route.ts");

        it("deve chamar generateCadenceEvents", () => {
            expect(markSentContent).toContain("generateCadenceEvents");
        });

        it("deve passar quoteId, organizationId, sentAt, quoteValue, timezone", () => {
            expect(markSentContent).toContain("quoteId: id");
            expect(markSentContent).toContain("organizationId: session.user.organizationId");
            expect(markSentContent).toContain("sentAt: now");
            expect(markSentContent).toContain("quoteValue: quote.value");
            expect(markSentContent).toContain("timezone");
        });

        it("deve retornar cadenceResult com eventos criados", () => {
            expect(markSentContent).toContain("cadence: cadenceResult");
        });
    });

    describe("Step 2: generateCadenceEvents function", () => {
        const cadenceContent = readFile("src/lib/cadence.ts");

        it("deve criar 4 eventos (D+1, D+3, D+7, D+14)", () => {
            expect(cadenceContent).toContain("email_d1");
            expect(cadenceContent).toContain("email_d3");
            expect(cadenceContent).toContain("call_d7");
            expect(cadenceContent).toContain("email_d14");
        });

        it("deve usar addBusinessDays para calcular datas", () => {
            expect(cadenceContent).toContain("addBusinessDays(sentAt, schedule.daysOffset");
        });

        it("deve aplicar priority HIGH para valor >= 1000", () => {
            expect(cadenceContent).toContain("HIGH_VALUE_THRESHOLD");
            expect(cadenceContent).toContain("1000");
            expect(cadenceContent).toContain('callPriority: CallPriority = valueNum >= HIGH_VALUE_THRESHOLD ? "HIGH" : "LOW"');
        });

        it("deve cancelar eventos anteriores em transação", () => {
            expect(cadenceContent).toContain("$transaction");
            expect(cadenceContent).toContain('status: "cancelled"');
            expect(cadenceContent).toContain('cancelReason: "resent"');
        });

        it("deve criar eventos com createMany", () => {
            expect(cadenceContent).toContain("tx.cadenceEvent.createMany");
        });

        it("deve atualizar ritmoStage para fup_d1", () => {
            expect(cadenceContent).toContain('ritmoStage: "fup_d1"');
        });
    });

    describe("Step 3: cron process-cadence", () => {
        const cronContent = readFile("src/app/api/cron/process-cadence/route.ts");

        it("deve liberar orphan claims", () => {
            expect(cronContent).toContain("CLAIM_TIMEOUT_MINUTES");
            expect(cronContent).toContain("orphanThreshold");
        });

        it("deve usar FOR UPDATE SKIP LOCKED para claim atómico", () => {
            expect(cronContent).toContain("FOR UPDATE SKIP LOCKED");
        });

        it("deve verificar se é dia útil", () => {
            expect(cronContent).toContain("isBusinessDay");
        });

        it("deve verificar janela de envio", () => {
            expect(cronContent).toContain("isWithinSendWindow");
        });

        it("deve cancelar eventos se quote mudou status", () => {
            expect(cronContent).toContain('["won", "lost", "negotiation"]');
            expect(cronContent).toContain('status: "cancelled"');
            expect(cronContent).toContain('cancelReason: "status_changed"');
        });

        it("deve criar task alternativa quando não há email", () => {
            expect(cronContent).toContain("getNoEmailTaskTitle");
            expect(cronContent).toContain("getNoEmailTaskDescription");
        });

        it("deve criar task com prisma.task.create", () => {
            expect(cronContent).toContain("prisma.task.create");
        });

        it("deve atualizar ritmoStage progressivamente", () => {
            expect(cronContent).toContain("updateQuoteRitmoStage");
            expect(cronContent).toContain("fup_d3");
            expect(cronContent).toContain("fup_d7");
            expect(cronContent).toContain("fup_d14");
            expect(cronContent).toContain("completed");
        });
    });

    describe("Step 4: today actions API", () => {
        const actionsContent = readFile("src/app/api/actions/today/route.ts");

        it("deve buscar cadenceEvents para hoje", () => {
            expect(actionsContent).toContain("prisma.cadenceEvent.findMany");
            expect(actionsContent).toContain("todayStart");
            expect(actionsContent).toContain("todayEnd");
        });

        it("deve buscar tasks para hoje", () => {
            expect(actionsContent).toContain("prisma.task.findMany");
            expect(actionsContent).toContain("dueAt");
        });

        it("deve separar emails e calls", () => {
            expect(actionsContent).toContain("emailEvents");
            expect(actionsContent).toContain("callEvents");
        });

        it("deve retornar summary com totais", () => {
            expect(actionsContent).toContain("summary");
            expect(actionsContent).toContain("total:");
            expect(actionsContent).toContain("emails:");
            expect(actionsContent).toContain("calls:");
            expect(actionsContent).toContain("highPriority:");
        });
    });

    describe("Step 5: Dashboard integration", () => {
        const dashboardContent = readFile("src/app/dashboard/page.tsx");

        it("deve chamar getDashboardData com organizationId e timezone", () => {
            expect(dashboardContent).toContain("getDashboardData");
            expect(dashboardContent).toContain("session.user.organizationId");
            expect(dashboardContent).toContain("timezone");
        });

        it("deve buscar todayEvents e todayTasks", () => {
            expect(dashboardContent).toContain("todayEvents");
            expect(dashboardContent).toContain("todayTasks");
        });

        it("deve renderizar ActionsList", () => {
            expect(dashboardContent).toContain("ActionsList");
        });
    });

    describe("Sanity Checks", () => {
        describe("1. firstSentAt imutável", () => {
            const markSent = readFile("src/app/api/quotes/[id]/mark-sent/route.ts");

            it("só define firstSentAt na primeira vez", () => {
                expect(markSent).toContain("isFirstSend = !quote.firstSentAt");
                expect(markSent).toContain("...(isFirstSend && { firstSentAt: now })");
            });
        });

        describe("2. Billing conta só primeiro envio", () => {
            const markSent = readFile("src/app/api/quotes/[id]/mark-sent/route.ts");

            it("incrementa usage só no primeiro envio", () => {
                expect(markSent).toContain("if (isFirstSend)");
                expect(markSent).toContain("incrementQuotesSent");
            });
        });

        describe("3. Skip sem email cria task alternativa", () => {
            const cron = readFile("src/app/api/cron/process-cadence/route.ts");

            it("não faz skip silencioso, cria task de call", () => {
                expect(cron).toContain("getNoEmailTaskTitle");
                expect(cron).toContain('"call"');
            });
        });

        describe("4. Timezone Europe/Lisbon", () => {
            const businessDays = readFile("src/lib/business-days.ts");

            it("usa Europe/Lisbon como default", () => {
                expect(businessDays).toContain('DEFAULT_TIMEZONE = "Europe/Lisbon"');
            });
        });

        describe("5. Orphan claims só libera scheduled", () => {
            const cron = readFile("src/app/api/cron/process-cadence/route.ts");

            it("libera claims antigos voltando para scheduled", () => {
                expect(cron).toContain('status: "claimed"');
                expect(cron).toContain('status: "scheduled"');
                expect(cron).toContain("claimedAt: null");
                expect(cron).toContain("claimedBy: null");
            });
        });

        describe("6. Reenvio reseta cadência corretamente", () => {
            const cadence = readFile("src/lib/cadence.ts");

            it("incrementa cadenceRunId", () => {
                expect(cadence).toContain("newRunId = (quote?.cadenceRunId ?? 0) + 1");
            });

            it("cancela eventos do run anterior", () => {
                expect(cadence).toContain("cadenceRunId: { lt: newRunId }");
            });

            it("reseta ritmoStage para fup_d1", () => {
                expect(cadence).toContain('ritmoStage: "fup_d1"');
            });
        });

        describe("7. Multi-tenant seguro", () => {
            const quotesRoute = readFile("src/app/api/quotes/[id]/route.ts");
            const contactsRoute = readFile("src/app/api/contacts/[id]/route.ts");

            it("valida orgId no WHERE do findFirst", () => {
                expect(quotesRoute).toContain("organizationId: session.user.organizationId");
                expect(contactsRoute).toContain("organizationId: session.user.organizationId");
            });
        });
    });
});
