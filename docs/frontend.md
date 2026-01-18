# Frontend & UX

A interface é construída com Next.js App Router, Tailwind CSS e Shadcn UI.

## Estrutura de Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| **Login** | `/login` | Ecrã de autenticação. |
| **Dashboard** | `/` | Visão geral, estatísticas, e **Feed de Ações** (Hoje). |
| **Quotes** | `/quotes` | Lista de orçamentos com filtros avançados. |
| **Quote Detail** | `/quotes/[id]` | Detalhe, timeline, edição e ações manuais. |
| **Templates** | `/templates` | Gestão de templates de email (T1, T2, Scripts). |
| **Settings** | `/settings` | Configurações da organização. |
| **Billing** | `/settings/billing` | Gestão de subscrição e faturas. |

## Componentes Chave

### Ações do Dashboard (Cards)
O Dashboard não é apenas analítico, é operacional. O utilizador vê "O que tenho de fazer hoje?".

1. **Card de Email:**
   - Mostra emails agendados prestes a sair (ou que requerem aprovação manual se configurado).
   - Botões: `Enviar Agora`, `Saltar`, `Editar`.
2. **Card de Chamada (D+7):**
   - Foco na execução da venda.
   - Dados: Cliente, Valor, Prioridade (HIGH/LOW).
   - **CTA Proposta:** Se a proposta não estiver anexada, o card mostra um aviso amarelo com atalhos para `Colar Link`, `Upload` ou `Copiar BCC`.
   - Ações: `Ligar` (tel link), `Copiar Script`, `Completar`.

### Timeline do Orçamento
No detalhe do orçamento (`/quotes/[id]`), uma timeline visual mostra:
- Eventos passados (emails enviados, chamadas feitas).
- Estado atual (marcado).
- Eventos futuros (previstos).
- Eventos cancelados (ex: runs anteriores).

### Upload de Proposta
Componente unificado que oferece três métodos:
1. **Upload de ficheiro** (Drag & drop).
2. **Link Externo** (Colar URL).
3. **Via BCC** (Instrução para enviar email com BCC especial).
