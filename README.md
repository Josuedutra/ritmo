# RITMO MVP

> **Follow-up Inteligente para Orçamentos B2B**

Cadência automática, dashboard de vendas e gestão de propostas.

## 📚 Documentação

A documentação completa do projeto encontra-se na pasta [`docs/`](docs/index.md).

- **[Visão Geral](docs/index.md)**
- **[Arquitetura](docs/architecture.md)**
- **[Base de Dados](docs/database.md)**
- **[API & Endpoints](docs/api.md)**
- **[Fluxos de Negócio](docs/workflows.md)**
- **[Roadmap](docs/roadmap.md)**

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+
- pnpm 8+
- PostgreSQL (Neon ou Supabase)

### Setup Local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# (Edite o .env.local com as suas credenciais)

# 3. Gerar Prisma Client
pnpm db:generate

# 4. Enviar schema para DB (Dev)
pnpm db:push

# 5. Iniciar servidor
pnpm dev
```

Aceda à aplicação em [http://localhost:3000](http://localhost:3000).

### Scripts Úteis

| Script           | Descrição                                          |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Inicia o servidor de desenvolvimento.              |
| `pnpm build`     | Compila para produção.                             |
| `pnpm db:push`   | Atualiza o schema da base de dados (prototipagem). |
| `pnpm db:studio` | Abre o Prisma Studio para visualizar dados.        |

## 🧪 Estrutura do Projeto

```
ritmo/
├── docs/             # Documentação do projeto
├── prisma/           # Schema e Seeds da BD
├── src/
│   ├── app/          # Next.js App Router (Páginas e API)
│   ├── lib/          # Utilitários e configurações (Auth, DB, etc)
│   ├── components/   # Componentes React
│   └── ...
└── ...
```

## 🔐 Licença

Privado - Todos os direitos reservados.
