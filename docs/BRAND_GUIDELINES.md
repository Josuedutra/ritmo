# Ritmo — Brand Guidelines (v1.0)

Este documento define os ativos, regras e padrões de aplicação da marca Ritmo para garantir consistência entre **app**, **landing**, **marketing** e **sistema**.

---

## 1) Essência da marca

### 1.1 Posicionamento
Ritmo é um produto de **precisão operacional**: cria cadência e consistência no follow-up de orçamentos, sem fricção e sem "CRM pesado".

### 1.2 Personalidade
- **Premium** (acabamento, clareza, contenção)
- **Engenharia** (precisão, fiabilidade, previsibilidade)
- **Humano-profissional** (linguagem simples, sem jargão desnecessário)

### 1.3 Tom de voz (PT-PT)
- Frases curtas, diretas e orientadas a ação.
- Evitar exageros ("incrível", "revolucionário") e emojis no produto.
- Microcopy com foco em confiança: "Confirmado", "Tudo pronto", "Seguinte passo".

---

## 2) Identidade visual

### 2.1 Elementos principais
A marca Ritmo é composta por:
1) **Símbolo:** "Ribbon R" (geométrico, 3D premium)
2) **Wordmark:** "Ritmo" (flat, sem efeitos 3D)
3) **Gradiente de marca:** Blue → Cold Emerald

### 2.2 Regra de ouro (3D vs Flat)
- **Produto (App):** usar **flat (SVG)** por padrão.
- **Landing/Marketing:** usar **3D** como elemento hero/decorativo premium.
- **Nunca** usar o render 3D como logo no header do app (nitidez e performance).

---

## 3) Ativos (assets)

### 3.1 Estrutura recomendada
```
public/brand/
├── logo-ritmo.png          # Lockup completo (3D R + wordmark)
├── ritmo-3d-hero.png       # 3D R isolado (hero/marketing)
├── ribbonR-flat-gradient.svg   # Flat "R" com gradiente (UI)
└── ribbonR-mono.svg        # Flat "R" monocromático (favicon)
```

### 3.2 Tipos de arquivo
- **SVG**: preferencial para UI (header, sidebar, footer, docs).
- **PNG**: renders 3D (hero e app icon/marketing).
- **Mono SVG**: para favicons e cenários com restrição de cor.

---

## 4) Símbolo "Ribbon R" — regras

### 4.1 Geometria (DNA)
- Forma de "R" **inequívoca** (não pode ler como "P").
- Ribbon de largura constante, com curvaturas controladas (sensação CAD).
- Arestas com micro-chanfro (chamfer) uniforme — estética "engenharia".

### 4.2 Terminação inferior (machined cut)
- A perna diagonal termina com **corte plano** (machined cut), com ângulo ~30°.
- Evitar pontas em "V" ou cunhas agressivas.

### 4.3 Material (3D)
- Satin / anodized composite (sem chrome).
- Highlight especular discreto e contínuo.
- Sem glow, sem lens flare.

---

## 5) Wordmark "Ritmo"

### 5.1 Tratamento
- O wordmark é **flat** (sem 3D).
- Cor recomendada no produto: **graphite/foreground** (alto contraste e premium).
- O gradiente deve viver no símbolo, não no texto (por padrão).

### 5.2 Lockup recomendado
- **Horizontal:** [Símbolo] + Ritmo
- Espaçamento entre símbolo e texto: ~0.35–0.50× altura do símbolo.
- Alinhamento vertical pelo "cap height" do wordmark.

---

## 6) Cores (tokens e aplicação)

### 6.1 Gradiente de marca
**Blue → Cold Emerald**
- O emerald deve ser "frio" (hue aproximado 168).
- Saturação moderada (evitar "neon").

### 6.2 Regras práticas
- **CTA primário:** gradiente de marca (onde faz sentido).
- **Texto principal:** graphite/foreground (evitar texto colorido).
- **Sucesso/Avisos/Erro:** usar tokens semânticos (success/warning/destructive),
  evitando cores "stock Tailwind".

### 6.3 Light/Dark
- Light: fundos off-white, bordas suaves, sombras discretas.
- Dark: graphite (evitar preto puro), contrastes controlados, brilho contido.

---

## 7) Tipografia (produto e marketing)

### 7.1 Regras gerais
- Fonte sem serifa, moderna e legível.
- Preferir pesos **Regular/Medium**.
- Evitar tracking excessivo; premium = contenção.

### 7.2 Headings
- H1/H2: forte e direto, sem slogans longos.
- Subtítulos: 70–80% de intensidade (muted).

---

## 8) Componentes e UI (design premium)

### 8.1 Botões (CTA)
- Primário: gradiente brand + shadow subtil.
- Secundário: outline neutro (sem cor vibrante).
- Hover: micro-brightness + shadow; evitar mudança de cor agressiva.

### 8.2 Alerts / Status
- Usar utilitários semânticos:
  - `.bg-info/.text-info/.border-info`
  - `.bg-success/.text-success/.border-success`
  - `.bg-warning/.text-warning/.border-warning`
  - `.bg-destructive/.text-destructive/.border-destructive`
- Mensagens curtas e objetivas.

### 8.3 "Aha moment" (micro-celebration)
- Permitido: ring/outline com token de marca + toast "success".
- Evitar confetti, emojis e animações chamativas.
- Duração curta (1.5–2.8s).

---

## 9) Landing page — regras premium

### 9.1 Header
- Sempre **logo flat** (símbolo + wordmark).
- Evitar wordmark colorido isolado; preferir wordmark em graphite.

### 9.2 Fundo
- Evitar confetti/dots coloridos.
- Preferir:
  - radial gradient off-white suave
  - grain discreto (2–4%)
  - "brand glow" subtil atrás do hero 3D

### 9.3 Hero 3D
- Usar render 3D do símbolo como elemento premium.
- Manter composição limpa (muito espaço negativo).

---

## 10) App — regras de consistência

### 10.1 Header e navegação
- Logo em SVG flat.
- Ícone 3D reservado para:
  - splash/marketing
  - app icon
  - páginas de sistema (opcional)

### 10.2 Páginas de sistema (billing/success/cancel)
- Layout centrado premium.
- Estados claros: loading, success, error.
- Textos PT-PT consistentes e sem promessas indevidas.

---

## 11) Ícone e favicon

### 11.1 App icon
- Pode usar render 3D **frontal** (variante "small").
- Fundo: off-white (light) / graphite (dark).
- Evitar detalhes finos demais.

### 11.2 Favicon
- Usar versão **mono** ou flat simplificada.
- Garantir legibilidade a 16px.

---

## 12) "Do / Don't" (resumo)

### Do
- Usar símbolo gradiente + wordmark graphite.
- Usar 3D apenas em hero e ícones (não no chrome do app).
- Manter UI limpa, com estados semânticos e micro-animações contidas.

### Don't
- Confetti/dots no fundo (baixa percepção premium).
- Glow neon, lens flare, saturação exagerada.
- Texto do wordmark em azul "genérico".
- Misturar múltiplos estilos de logo na mesma página.

---

## 13) Checklist de QA de marca (antes de release)
- [ ] Logo flat legível a 16/24/32px
- [ ] Favicon legível a 16px
- [ ] Header landing e app usam o mesmo lockup (flat)
- [ ] 3D presente apenas em hero/marketing e app icon
- [ ] CTAs principais usam gradiente brand (quando aplicável)
- [ ] Sem cores "stock" em badges/alerts (usar tokens)
- [ ] PT-PT consistente (acentuação e termos)

---

## 14) Notas de implementação (repo)
- Guardar assets em `/public/brand/`
- Documentar alterações em PR "brand: …"
- Evitar dependência de assets pesados no runtime do app (preferir SVG).

---

**Owner:** Ritmo
**Versão:** 1.0
**Última atualização:** 2026-01-25
