# RITMO — Design System v4.0

> Follow-up Inteligente para Orçamentos B2B  
> Versão 4.0 | Janeiro 2026  
> **Premium Emerald Brand + State Utilities**

---

## Changelog v4.0

### 1. Brand Emerald Refinado
- ✅ `--brand-to`: `oklch(0.72 0.17 165)` → `oklch(0.69 0.14 165)` (menos saturado, mais premium)
- ✅ Dark mode `--brand-to`: `oklch(0.74 0.16 165)` → `oklch(0.71 0.13 165)`

### 2. Primary Hover Afinado
- ✅ `--primary-hover`: `oklch(0.62 0.16 240)` → `oklch(0.62 0.13 240)` (chroma reduzido)

### 3. Novos Utilitários de Estado
```css
/* Success */
.bg-success { background-color: oklch(from var(--color-success) l c h / 0.1); }
.text-success { color: var(--color-success); }
.border-success { border-color: oklch(from var(--color-success) l c h / 0.3); }

/* Warning */
.bg-warning { background-color: oklch(from var(--color-warning) l c h / 0.1); }
.text-warning { color: var(--color-warning); }
.border-warning { border-color: oklch(from var(--color-warning) l c h / 0.3); }

/* Destructive */
.bg-destructive-subtle { background-color: oklch(from var(--color-destructive) l c h / 0.1); }
.text-destructive { color: var(--color-destructive); }
.border-destructive { border-color: oklch(from var(--color-destructive) l c h / 0.3); }

/* Info (brand) */
.bg-info { background-color: oklch(from var(--color-info) l c h / 0.1); }
.text-info { color: var(--color-info); }
.border-info { border-color: oklch(from var(--color-info) l c h / 0.3); }
```

### 4. Componentes Atualizados
- ✅ `Badge` — variante `info` adicionada
- ✅ `billing-page-client.tsx` — progress bar, status badges, feature checks
- ✅ `admin/referrals` — stat cards, status badges, action icons
- ✅ `quotes/page.tsx` — TAG_CONFIG, next action badge
- ✅ `quotes/[id]/page.tsx` — STAGE_CONFIG
- ✅ `quotes/[id]/quote-timeline.tsx` — STATUS_CONFIG
- ✅ `unsubscribe/page.tsx` — success/warning states
- ✅ `partners/page.tsx` — benefit icons

---

## Tokens de Cor Atualizados

### Brand (Light Mode)

| Token | OKLCH | Descrição |
|-------|-------|-----------|
| `--brand-from` | `oklch(0.70 0.15 240)` | Azul Ritmo |
| `--brand-to` | `oklch(0.69 0.14 165)` | Emerald Premium (refinado) |
| `--brand` | `oklch(0.70 0.15 240)` | Primary = from |

### Brand (Dark Mode)

| Token | OKLCH | Descrição |
|-------|-------|-----------|
| `--brand-from` | `oklch(0.72 0.14 240)` | Azul mais claro |
| `--brand-to` | `oklch(0.71 0.13 165)` | Emerald (dark mode) |
| `--brand` | `oklch(0.72 0.14 240)` | Primary |

### Hover States

| Token | Light | Dark |
|-------|-------|------|
| `--primary-hover` | `oklch(0.62 0.13 240)` | `oklch(0.65 0.15 240)` |

---

## Utilitários de Estado

### Uso

```tsx
// Success state (confirmações, ganhos)
<div className="bg-success text-success border border-success">
  <CheckCircle className="h-4 w-4 text-success" />
  Orçamento ganho
</div>

// Warning state (alertas, pendentes)
<div className="bg-warning text-warning border border-warning">
  <AlertTriangle className="h-4 w-4 text-warning" />
  A aproximar-se do limite
</div>

// Destructive state (erros, perdidos)
<div className="bg-destructive-subtle text-destructive border border-destructive">
  <XCircle className="h-4 w-4 text-destructive" />
  Falhou
</div>

// Info state (informações, pendentes neutros)
<div className="bg-info text-info border border-info">
  <Clock className="h-4 w-4 text-info" />
  Previsto para amanhã
</div>
```

### Migração de Cores Stock

| Antes (Tailwind stock) | Depois (semântico) |
|------------------------|---------------------|
| `bg-green-500/10 text-green-500` | `bg-success text-success` |
| `bg-yellow-500/10 text-yellow-500` | `bg-warning text-warning` |
| `bg-red-500/10 text-red-500` | `bg-destructive-subtle text-destructive` |
| `bg-blue-500/10 text-blue-500` | `bg-info text-info` |
| `text-green-600` | `text-success` |
| `text-yellow-600` | `text-warning` |
| `text-red-600` | `text-destructive` |
| `text-blue-600` | `text-info` |

---

## Ficheiros Migrados

### ✅ Concluídos

| Ficheiro | Alterações |
|----------|------------|
| `globals.css` | Brand tokens, state utilities |
| `badge.tsx` | Variante `info` |
| `billing-page-client.tsx` | Progress bar, status badges, checks |
| `admin/referrals/page.tsx` | Admin badge |
| `admin/referrals/referrals-client.tsx` | Stat cards, status badges |
| `unsubscribe/page.tsx` | Success/warning states |
| `partners/page.tsx` | Benefit icons |
| `quotes/page.tsx` | TAG_CONFIG, next action |
| `quotes/[id]/page.tsx` | STAGE_CONFIG |
| `quotes/[id]/quote-timeline.tsx` | STATUS_CONFIG |

### 📋 Pendentes (migração opcional)

Ficheiros que ainda usam cores Tailwind stock mas são menos críticos:

| Ficheiro | Tipo |
|----------|------|
| `page.tsx` (landing) | Decorativo (blurs, pulses) |
| `components/ui/toast.tsx` | UI component |
| `components/settings/*` | Settings pages |
| `components/scoreboard/*` | Dashboard components |
| `components/landing/*` | Landing page components |
| `components/actions/*` | Action components |
| `templates/templates-list.tsx` | Templates page |
| `reports/reports-client.tsx` | Reports page |

---

## globals.css v4 (Excerto)

```css
:root {
  color-scheme: light;
  
  /* Brand Colors - Ritmo Gradient (Blue → Premium Emerald) */
  --brand-from: oklch(0.70 0.15 240);
  --brand-to: oklch(0.69 0.14 165);     /* Premium Emerald (refined) */
  --brand: oklch(0.70 0.15 240);

  /* Primary Hover - reduced chroma */
  --primary-hover: oklch(0.62 0.13 240);
  
  /* ... rest of tokens ... */
}

.dark {
  color-scheme: dark;
  
  --brand-from: oklch(0.72 0.14 240);
  --brand-to: oklch(0.71 0.13 165);     /* Premium Emerald (dark mode) */
  --brand: oklch(0.72 0.14 240);
  
  /* ... rest of tokens ... */
}

/* ==========================================================================
   STATE UTILITIES
   ========================================================================== */

/* Success state */
.bg-success {
  background-color: oklch(from var(--color-success) l c h / 0.1);
}
.text-success {
  color: var(--color-success);
}
.border-success {
  border-color: oklch(from var(--color-success) l c h / 0.3);
}

/* Warning state */
.bg-warning {
  background-color: oklch(from var(--color-warning) l c h / 0.1);
}
.text-warning {
  color: var(--color-warning);
}
.border-warning {
  border-color: oklch(from var(--color-warning) l c h / 0.3);
}

/* Destructive state */
.bg-destructive-subtle {
  background-color: oklch(from var(--color-destructive) l c h / 0.1);
}
.text-destructive {
  color: var(--color-destructive);
}
.border-destructive {
  border-color: oklch(from var(--color-destructive) l c h / 0.3);
}

/* Info state (using brand) */
.bg-info {
  background-color: oklch(from var(--color-info) l c h / 0.1);
}
.text-info {
  color: var(--color-info);
}
.border-info {
  border-color: oklch(from var(--color-info) l c h / 0.3);
}
```

---

## QA Checklist

### Páginas Verificadas

- [x] `/settings/billing` — Progress bar, status badges, feature checks usam tokens
- [x] `/quotes` — Tags e next action usam tokens
- [x] `/quotes/[id]` — Timeline e stage badges usam tokens
- [x] `/unsubscribe` — Success/warning states usam tokens
- [x] `/admin/referrals` — Stat cards e status badges usam tokens

### Validações

- [x] Focus ring visível (usa `--ring` = `--brand`)
- [x] Contrastes AA mantidos
- [x] Gradiente brand menos saturado (premium)
- [x] Build passa

---

## Commit Message

```
style(theme): premium emerald brand + state utilities

- Refine --brand-to to oklch(0.69 0.14 165) for premium look
- Reduce --primary-hover chroma (0.16 → 0.13) for subtler hover
- Add state utilities: .bg-success/.text-success/.border-success
- Add state utilities: .bg-warning/.text-warning/.border-warning  
- Add state utilities: .bg-destructive-subtle/.text-destructive/.border-destructive
- Migrate billing page to semantic tokens
- Migrate admin referrals to semantic tokens
- Migrate quotes pages to semantic tokens
- Migrate unsubscribe/partners pages to semantic tokens

No functional changes.
```

---

*Design System Ritmo v4.0 — Premium Emerald Brand*  
*Regra de Ouro: Sempre usar tokens semânticos em vez de cores Tailwind stock.*
