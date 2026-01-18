# Modelo de Dados (Base de Dados)

O sistema utiliza PostgreSQL hospedado no Neon, gerido via Prisma ORM.

## 1. Diagrama ERD Simplificado

```
organizations (1) ──< users (N)
      │
      ├──< contacts (N)
      │         │
      ├──< quotes (N) ──< cadence_events (N)
      │         │              │
      │         └──────< tasks (N)
      │
      ├──< templates (N)
      ├──< suppression_global (N)
      ├──< subscriptions (1)
      └──< inbound_ingestions (N)
```

## 2. Enums Importantes (v1.1)

### Business Status (`business_status`)
Estado comercial real do orçamento.
- `draft` (Rascunho)
- `sent` (Enviado ao cliente)
- `negotiation` (Em negociação)
- `won` (Ganho)
- `lost` (Perdido)

### Ritmo Stage (`ritmo_stage`)
Fase do follow-up automático.
- `idle` (Sem cadência ativa)
- `fup_d1` (Aguardando/Processou D+1)
- `fup_d3` (Aguardando/Processou D+3)
- `fup_d7` (Aguardando/Processou D+7)
- `fup_d14` (Aguardando/Processou D+14)
- `completed` (Cadência completa)
- `paused` (Pausado manualmente)
- `stopped` (Parado - ex: won/lost)

### Cadence Event Status (`cadence_event_status`)
Estado de cada evento agendado.
- `scheduled` (Agendado)
- `claimed` (Reservado por worker - em processamento)
- `sent` (Enviado com sucesso)
- `completed` (Tarefa completada - para calls)
- `skipped` (Saltado - ex: supressão, sem email)
- `cancelled` (Cancelado - ex: status mudou, reenvio)
- `deferred` (Adiado - ex: fora da janela horária)
- `failed` (Erro técnico)

## 3. Descrição das Tabelas Principais

### `organizations`
Entidade raiz para multi-tenancy.
- Configurações globais: `timezone`, `send_window_start/end`, `email_cooldown_hours`.
- Configurações SMTP opcionais.

### `quotes`
O coração do sistema.
- **Campos Chave:**
  - `cadence_run_id`: Incrementado a cada reenvio da proposta. Permite reiniciar a cadência.
  - `first_sent_at`: Data do **primeiro** envio. Imutável. Usado para billing.
  - `business_status` vs `ritmo_stage`: Separação clara entre o estado do negócio e o estado da automação.

### `cadence_events`
Eventos individuais da cadência (envio de email, tarefa de chamada).
- **Claim Transacional:** Campos `claimed_at`, `claimed_by`, `processed_at` para garantir execução única em ambiente serverless.
- **Rastreio:** `skip_reason` e `cancel_reason` explicam por que um evento não ocorreu.

### `contacts`
Clientes associados aos orçamentos.
- **Nota v1.1:** O campo `email` é **NULLABLE**. Um contacto pode existir apenas com telefone para registo. Nesses casos, eventos de email são `skipped`.

### `usage_counters`
Contadores para billing.
- Agregados por `organization_id` e período (`period_start` / `period_end`).
- `quotes_sent` conta apenas novos envios (`first_sent_at`).

Para detalhe completo dos campos, consulte o ficheiro `prisma/schema.prisma`.
