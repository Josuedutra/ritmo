# Roadmap e Sprints

Plano de execução para o MVP versão 1.1.

## Sprint 0: Setup & Fundações (Dias 1-2)
- [x] Repo Monorepo (Next.js 14 + TS + Tailwind).
- [x] Configuração Neon DB e Prisma Schema inicial.
- [x] Autenticação NextAuth v5.
- [x] Deploy inicial na Vercel (Staging).

## Sprint 1: Core - O Motor (Dias 3-10)
- [ ] Schema Completo v1.1 (Enums, tabelas transacionais).
- [ ] CRUD de Organizações e Contactos.
- [ ] CRUD de Quotes (Orçamentos).
- [ ] Lógica de Dias Úteis (`business-days.ts`).
- [ ] **Motor de Cadência:** Endpoint de processamento com Claim Transacional.
- [ ] Tasks e Dashboard Básico.

## Sprint 2: Email & Billing (Dias 11-18)
- [ ] Integração real com Resend.
- [ ] Templates dinâmicos com variáveis.
- [ ] Sistema de Supressão (Opt-out).
- [ ] **Billing:** Implementação da contagem exata (`first_sent_at`) e integração Stripe.
- [ ] Página de gestão de subscrição.

## Sprint 3: Inbound & UX Avançada (Dias 19-26)
- [ ] Integração Supabase Storage.
- [ ] Webhook de Inbound Email (Parse BCC).
- [ ] Card de Chamada "Rico" (com gestão de proposta anexada).
- [ ] UI de Detalhe de Orçamento com Timeline.
- [ ] Ação de "Reenviar Orçamento" (Reset de cadência).

## Sprint 4: Hardening & Launch (Dias 27-30)
- [ ] Testes Unitários Críticos (Lógica de dias úteis, Billing).
- [ ] Testes E2E (Fluxo principal).
- [ ] Documentação de API.
- [ ] Onboarding de utilizadores Beta.

## Riscos e Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Race Conditions no Cron** | Alto (duplo envio) | Implementação de `UPDATE...SKIP LOCKED` (Claim). |
| **Billing Incorreto** | Alto (perda financeira) | Testes exaustivos e campo `first_sent_at` imutável. |
| **Deliverability de Email** | Alto (spam) | Configuração correta de DKIM/SPF no Resend. |
| **Parsing de Inbound** | Médio | Fallback manual caso o parse falhe. |
