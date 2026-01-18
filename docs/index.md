# Documentação do Projeto RITMO

Bem-vindo à documentação oficial do **RITMO MVP**.

**Versão:** 1.1  
**Data da última atualização:** 2026-01-18  

## Visão Geral

O **RITMO** é um SaaS de "cadência + painel + envio" para follow-up de orçamentos B2B. O objetivo não é substituir um CRM completo, mas sim controlar o estado, a próxima ação e disparar follow-ups automáticos para orçamentos enviados.

### Objetivos Principais

- **Automação de Follow-up:** Cadências de e-mail automáticas (D+1, D+3, D+14).
- **Gestão de Tarefas:** Criação de tarefas de chamada telefónica para orçamentos de alto valor ou em momentos chaves (D+7).
- **Anti-Robô:** Regras inteligentes para evitar spam, respeitar horários (09:00-18:00) e dias úteis.
- **Integração Simples:** Receção de propostas via Bcc de e-mail ou upload direto.

## Estrutura da Documentação

- **[Arquitetura](architecture.md)**: Detalhes da stack tecnológica, diagramas de componentes e decisões arquiteturais.
- **[Base de Dados](database.md)**: Modelo de dados (ERD), schemas, e definições de Enums.
- **[API & Endpoints](api.md)**: Especificação dos endpoints da API, autenticação e contratos de dados.
- **[Fluxos & Lógica](workflows.md)**: Explicação detalhada dos fluxos principais (e.g., motor de cadência, billing, inbound e-mail).
- **[Frontend & UX](frontend.md)**: Estrutura das páginas, componentes visuais e user experience.
- **[Roadmap & Sprint](roadmap.md)**: Plano de desenvolvimento, sprints definidos e análise de riscos.

Para começar a desenvolver, consulte o [README.com](../README.md) na raiz do projeto.
