# RITMO — Design System v3.0

> Follow-up Inteligente para Orçamentos B2B  
> Versão 3.0 | Janeiro 2026  
> **Premium Brand Palette + Refined Surfaces**

---

## Changelog v3.0

### Correções
- ✅ `color-scheme: dark` → `color-scheme: light` em `:root` e `color-scheme: dark` em `.dark`

### Novos Tokens de Marca
- ✅ `--brand`, `--brand-from`, `--brand-to` (gradiente Ritmo: Blue → Emerald)
- ✅ `--primary` e `--ring` agora derivam de `--brand`
- ✅ `--info` mapeado para `--brand` (substituir `bg-blue-500`)

### Paleta Premium
- ✅ `--background`: off-white subtil (`oklch(0.992 0.002 90)`) em vez de branco puro
- ✅ `--muted`, `--accent`, `--secondary`: tons mais suaves com tint warm
- ✅ `--border`: mais delicado (`oklch(0.92 0.003 90)`)
- ✅ `--success`, `--warning`: chroma reduzido para sofisticação
- ✅ `--destructive`: menos saturado que stock red-600

### Sombras
- ✅ `.card-elevated`: opacidade reduzida (0.3 → 0.08)
- ✅ Novas classes: `.shadow-premium-sm/md/lg/xl`

### Novos Utilitários CSS
- ✅ `.text-gradient` (usa brand tokens)
- ✅ `.bg-gradient-brand`, `.bg-gradient-brand-h`
- ✅ `.btn-cta-primary`, `.btn-cta-strong`
- ✅ `.bg-info`, `.text-info`, `.border-info`

---

## 1. Tokens de Marca (Brand)

### Gradiente Ritmo

```css
--brand-from: oklch(0.70 0.15 240);   /* ≈ Blue 400 */
--brand-to: oklch(0.72 0.17 165);     /* ≈ Emerald 400 */
--brand: oklch(0.70 0.15 240);        /* Primary = from */
```

### Mapeamento

| Token | Deriva de | Uso |
|-------|-----------|-----|
| `--primary` | `--brand` | Botões, links, badges |
| `--ring` | `--brand` | Focus states |
| `--info` | `--brand` | Estados informativos (substituir blue-500) |

### Uso em Componentes

```tsx
// Gradiente no texto (logo)
<span className="text-gradient">Ritmo</span>

// Gradiente em botão CTA
<Button className="bg-gradient-brand-h text-white">
  Começar Trial
</Button>

// Ou usar classe utilitária
<Button className="btn-cta-primary rounded-full">
  Começar Trial
</Button>

// Estado info (em vez de bg-blue-500/10)
<Badge variant="info">Pendente</Badge>
```

---

## 2. Paleta de Cores

### Light Mode — Premium Surfaces

| Token | OKLCH | Descrição |
|-------|-------|-----------|
| `--background` | `oklch(0.992 0.002 90)` | Off-white subtil (warm) |
| `--foreground` | `oklch(0.145 0.015 260)` | Cinza profundo com tint azul |
| `--card` | `oklch(0.998 0.001 90)` | Ligeiramente mais claro |
| `--popover` | `oklch(1 0 0)` | Branco puro (elevação) |
| `--secondary` | `oklch(0.97 0.003 90)` | Cinza suave warm |
| `--muted` | `oklch(0.965 0.003 90)` | Áreas muted |
| `--muted-foreground` | `oklch(0.50 0.01 260)` | Texto secundário |
| `--accent` | `oklch(0.96 0.005 90)` | Hover states |
| `--border` | `oklch(0.92 0.003 90)` | Bordas delicadas |
| `--input` | `oklch(0.94 0.003 90)` | Fundo inputs |

### Status Colors — Chroma Reduzido

| Token | Light | Dark | Descrição |
|-------|-------|------|-----------|
| `--success` | `oklch(0.62 0.14 150)` | `oklch(0.55 0.13 150)` | Verde sofisticado |
| `--warning` | `oklch(0.72 0.12 75)` | `oklch(0.62 0.11 75)` | Âmbar suave |
| `--destructive` | `oklch(0.55 0.18 25)` | `oklch(0.50 0.16 25)` | Vermelho refinado |
| `--info` | `var(--brand)` | `var(--brand)` | Azul da marca |

### Dark Mode

| Token | OKLCH | Descrição |
|-------|-------|-----------|
| `--background` | `oklch(0.05 0 0)` | Preto profundo |
| `--foreground` | `oklch(0.97 0 0)` | Branco suave |
| `--card` | `oklch(0.08 0 0)` | Elevação sutil |
| `--border` | `oklch(0.20 0 0)` | Bordas escuras |
| `--brand` | `oklch(0.72 0.14 240)` | Azul mais claro |

---

## 3. Sombras Premium

### Classes Disponíveis

| Classe | Light | Dark |
|--------|-------|------|
| `.shadow-premium-sm` | `0.03/0.06` opacity | `0.15/0.25` opacity |
| `.shadow-premium-md` | `0.03/0.06` opacity | `0.15/0.25` opacity |
| `.shadow-premium-lg` | `0.04/0.08` opacity | `0.20/0.30` opacity |
| `.shadow-premium-xl` | `0.04/0.08` opacity | `0.20/0.30` opacity |
| `.card-elevated` | `0.04/0.08` opacity | `0.20/0.30` opacity |

### Recomendação

```tsx
// Preferir border + ring para profundidade
<Card className="border border-border shadow-premium-sm">

// Em vez de sombras pesadas
<Card className="shadow-lg">  // ❌ Evitar
```

---

## 4. Botões CTA

### Classes Utilitárias

```css
/* Primary CTA com gradiente brand */
.btn-cta-primary {
  background: linear-gradient(to right, var(--brand-from), var(--brand-to));
  color: white;
}

/* Strong CTA (foreground como bg) */
.btn-cta-strong {
  background: var(--foreground);
  color: var(--background);
}
```

### Migração da Landing

**Antes:**
```tsx
<Button className="bg-black text-white hover:bg-zinc-800">
  Começar Trial
</Button>
```

**Depois:**
```tsx
<Button className="btn-cta-strong rounded-full">
  Começar Trial
</Button>

// Ou com gradiente brand:
<Button className="btn-cta-primary rounded-full">
  Começar Trial
</Button>
```

---

## 5. Badge Variantes

### Disponíveis

| Variante | Uso |
|----------|-----|
| `default` | Primário (brand bg) |
| `secondary` | Neutro |
| `success` | Ganho, confirmado |
| `warning` | Atenção, pendente |
| `destructive` | Erro, perdido |
| `info` | Informativo (brand) — **NOVO** |
| `outline` | Neutro com borda |
| `high` | Prioridade alta |
| `low` | Prioridade baixa |

```tsx
// Migrar de:
<span className="bg-blue-500/10 text-blue-500">Pendente</span>

// Para:
<Badge variant="info">Pendente</Badge>
```

---

## 6. Ficheiros a Refatorar

### Uso de `bg-blue-*` / `text-blue-*`

| Ficheiro | Linha(s) | Ação |
|----------|----------|------|
| `quotes/[id]/quote-tags-notes.tsx` | 13 | Usar `--color-info` ou `Badge variant="info"` |
| `quotes/[id]/quote-timeline.tsx` | 69, 76, 171, 326, 330 | Substituir por `--color-info` |
| `quotes/[id]/page.tsx` | 90, 91 | Usar token info |
| `quotes/page.tsx` | 29, 287 | Usar Badge info |
| `admin/referrals/referrals-client.tsx` | 340, 341, 558, 633 | Usar tokens |
| `reports/reports-client.tsx` | 187 | Adicionar info ao mapping |
| `templates/templates-list.tsx` | 145 | Usar token info |
| `unsubscribe/page.tsx` | 109, 110 | Usar `--color-success` ou `--color-info` |
| `partners/page.tsx` | 84, 85 | Usar token |

### Uso de `bg-black` na Landing

| Ficheiro | Linha(s) | Ação |
|----------|----------|------|
| `page.tsx` | 60, 89, 676 | Usar `.btn-cta-strong` ou `bg-gradient-brand-h` |

---

## 7. globals.css Completo

```css
@import "tailwindcss";

@theme {
  /* Core Colors */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  
  /* Sidebar */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-border: var(--sidebar-border);

  /* Brand Colors */
  --color-brand: var(--brand);
  --color-brand-from: var(--brand-from);
  --color-brand-to: var(--brand-to);

  /* Status Colors */
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);

  /* Priority Colors */
  --color-priority-high: var(--priority-high);
  --color-priority-low: var(--priority-low);

  /* Hover States */
  --color-primary-hover: var(--primary-hover);

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.625rem;
  --radius-xl: 0.75rem;
}

:root {
  color-scheme: light;
  
  /* Brand */
  --brand-from: oklch(0.70 0.15 240);
  --brand-to: oklch(0.72 0.17 165);
  --brand: oklch(0.70 0.15 240);

  /* Surfaces */
  --background: oklch(0.992 0.002 90);
  --foreground: oklch(0.145 0.015 260);
  --card: oklch(0.998 0.001 90);
  --card-foreground: oklch(0.145 0.015 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0.015 260);

  /* Primary */
  --primary: var(--brand);
  --primary-foreground: oklch(0.99 0 0);
  --primary-hover: oklch(0.62 0.16 240);

  /* Secondary/Muted/Accent */
  --secondary: oklch(0.97 0.003 90);
  --secondary-foreground: oklch(0.25 0.02 260);
  --muted: oklch(0.965 0.003 90);
  --muted-foreground: oklch(0.50 0.01 260);
  --accent: oklch(0.96 0.005 90);
  --accent-foreground: oklch(0.25 0.02 260);

  /* Destructive */
  --destructive: oklch(0.55 0.18 25);
  --destructive-foreground: oklch(0.99 0 0);

  /* Borders */
  --border: oklch(0.92 0.003 90);
  --input: oklch(0.94 0.003 90);
  --ring: var(--brand);

  /* Status */
  --success: oklch(0.62 0.14 150);
  --warning: oklch(0.72 0.12 75);
  --info: var(--brand);

  /* Priority */
  --priority-high: oklch(0.58 0.16 25);
  --priority-low: oklch(0.58 0.12 150);

  /* Sidebar */
  --sidebar: oklch(0.985 0.002 90);
  --sidebar-foreground: oklch(0.25 0.015 260);
  --sidebar-accent: oklch(0.95 0.003 90);
  --sidebar-border: oklch(0.92 0.003 90);
}

.dark {
  color-scheme: dark;
  
  /* Brand (adjusted) */
  --brand-from: oklch(0.72 0.14 240);
  --brand-to: oklch(0.74 0.16 165);
  --brand: oklch(0.72 0.14 240);

  /* Surfaces */
  --background: oklch(0.05 0 0);
  --foreground: oklch(0.97 0 0);
  --card: oklch(0.08 0 0);
  --card-foreground: oklch(0.97 0 0);
  --popover: oklch(0.10 0 0);
  --popover-foreground: oklch(0.97 0 0);

  /* Primary */
  --primary: var(--brand);
  --primary-foreground: oklch(0.99 0 0);
  --primary-hover: oklch(0.65 0.15 240);

  /* Secondary/Muted/Accent */
  --secondary: oklch(0.14 0 0);
  --secondary-foreground: oklch(0.97 0 0);
  --muted: oklch(0.14 0 0);
  --muted-foreground: oklch(0.60 0 0);
  --accent: oklch(0.16 0 0);
  --accent-foreground: oklch(0.97 0 0);

  /* Destructive */
  --destructive: oklch(0.50 0.16 25);
  --destructive-foreground: oklch(0.99 0 0);

  /* Borders */
  --border: oklch(0.20 0 0);
  --input: oklch(0.18 0 0);
  --ring: var(--brand);

  /* Status */
  --success: oklch(0.55 0.13 150);
  --warning: oklch(0.62 0.11 75);
  --info: var(--brand);

  /* Priority */
  --priority-high: oklch(0.52 0.15 25);
  --priority-low: oklch(0.52 0.11 150);

  /* Sidebar */
  --sidebar: oklch(0.06 0 0);
  --sidebar-foreground: oklch(0.88 0 0);
  --sidebar-accent: oklch(0.12 0 0);
  --sidebar-border: oklch(0.16 0 0);
}

/* ... (base styles, utilities - ver ficheiro completo) */
```

---

## 8. Acessibilidade — Contraste

### Verificação WCAG AA

| Combinação | Ratio Estimado | Status |
|------------|----------------|--------|
| foreground / background | ~14:1 | ✅ AAA |
| muted-foreground / background | ~5:1 | ✅ AA |
| primary / primary-foreground | ~4.7:1 | ✅ AA |
| success / background | ~4.5:1 | ✅ AA |
| warning / background | ~3.5:1 | ⚠️ Large text only |
| destructive / destructive-fg | ~5:1 | ✅ AA |

**Nota:** Warning em texto pequeno pode precisar ajuste. Usar apenas em badges/labels grandes ou com fundo.

---

## 9. Checklist QA

### Páginas a Verificar

- [ ] `/signup` — Focus ring usa brand?
- [ ] `/login` — Gradiente CTA consistente?
- [ ] `/onboarding` — Estados info usam tokens?
- [ ] `/dashboard` — Cards com sombras premium?
- [ ] `/settings/billing` — Success/error states corretos?
- [ ] `/quotes/[id]` — Timeline usa info token?

### Validações

- [ ] Nenhum `bg-blue-500`, `text-blue-*` em UI premium
- [ ] Focus ring visível em todos os interativos
- [ ] Contraste AA em texto body
- [ ] Sombras subtis (não stock)

---

## 10. Commit Message

```
style(design-system): premium brand palette + surfaces + color-scheme fix

- Fix color-scheme: light/dark per mode instead of global dark
- Add brand tokens (--brand, --brand-from, --brand-to)
- Map --primary and --ring to --brand
- Add --info token for informational states (replaces blue-500)
- Refine light mode surfaces (off-white, warmer tones)
- Reduce status colors chroma for sophistication
- Soften shadow utilities (0.3 → 0.08 opacity)
- Add utility classes: .bg-gradient-brand, .btn-cta-primary/strong
- Add Badge variant="info"

No functional changes.
```

---

*Design System Ritmo v3.0 — Premium Brand Palette*  
*Regra de Ouro: Nunca usar valores arbitrários. Sempre usar tokens semânticos.*
