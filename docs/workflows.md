# Fluxos e Lógica Principal

Este documento detalha os algoritmos e fluxos de negócio críticos do RITMO.

## 1. Fluxo: Enviar Orçamento e Gerar Cadência

Quando o utilizador clica em "Enviar" ou chama a API de envio:

1. **Verificação Inicial:**
   - Se `first_sent_at` é NULL (primeiro envio):
     - Define `first_sent_at = NOW()`.
     - Incrementa o contador `quotes_sent` para o período atual (Billing).
   - Se já foi enviado antes e é um reenvio:
     - Não incrementa billing.
     - Incrementa `cadence_run_id` (+1).

2. **Limpeza de Estado Anterior:**
   - Se `cadence_run_id > 1`, todos os eventos pendentes da run anterior são cancelados (`status='cancelled'`, `cancel_reason='resent'`).

3. **Geração de Eventos:**
   - O sistema calcula as datas alvo usando **Dias Úteis** (feriados de Portugal e fins de semana ignorados).
   - **Agendamento Padrão:**
     - **D+1:** Email de Follow-up 1.
     - **D+3:** Email de Follow-up 2.
     - **D+7:** Chamada Telefónica (Task com prioridade calculada).
     - **D+14:** Email de Fecho/Breakup.

4. **Atualização de Estado:**
   - `business_status` → `sent`
   - `ritmo_stage` → `fup_d1`

## 2. Fluxo: Processamento da Cadência (Cron)

O processamento é executado a cada minuto/hora e segue uma lógica estrita para garantir consistência e evitar spam.

### Passo 1: Claim Transacional
Para evitar que múltiplos workers processem o mesmo evento (race condition), usamos um "Claim" atómico na base de dados:
```sql
UPDATE cadence_events SET status='claimed', claimed_by=worker WHERE ... RETURNING *
```

### Passo 2: Validações (Pipeline de Decisão)
Para cada evento "claimed", ocorrem as seguintes validações em ordem:

1. **Janela Horária:** O momento atual está entre 09:00 e 18:00 (Lisboa)?
   - *Não:* Adia (`deferred`) para o próximo dia útil às 09:00.
2. **Regra de 48h:** Foi enviado algum email para este orçamento nas últimas 48h?
   - *Sim:* Adia (`deferred`) até completar 48h.
3. **Validação de Contacto:** O contacto tem e-mail?
   - *Não:* Marca como `skipped` (reason: `no_email`).
4. **Supressão Global:** O e-mail está na lista de opt-out/bounces?
   - *Sim:* Marca como `skipped` (reason: `suppressed`).
5. **Estado do Negócio:** O orçamento já foi Ganho ou Perdido?
   - *Sim:* Cancela o evento (`cancelled`).

### Passo 3: Execução
- **Email:** Envia via Provider (Resend/SMTP), cria `email_log`.
- **Chamada:** Cria/Atualiza uma `Task` na lista do utilizador.

### Passo 4: Finalização
- Atualiza o evento para `sent` ou `completed`.
- Atualiza o `ritmo_stage` do orçamento.

## 3. Fluxo: Inbound Email (BCC)

Permite associar propostas enviadas manualmente (Outlook/Gmail) ao sistema.

1. Utilizador envia email para cliente, colocando em BCC: `bcc+{org_id}+{quote_id}@inbound.ritmo.app`.
2. Resend recebe e chama o Webhook.
3. Sistema faz parse do endereço `To` para extrair IDs.
4. **Se houver anexo PDF:**
   - Upload para Supabase Storage.
   - Atualiza `quote.proposal_file_id`.
5. **Se houver link no corpo:**
   - Atualiza `quote.proposal_link`.
6. Resultado: O Card da Chamada no Dashboard passa a mostrar "Proposta Anexada".
