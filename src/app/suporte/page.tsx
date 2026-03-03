import Link from "next/link";
import { ArrowLeft, MessageCircle, Mail, Clock, AlertTriangle } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
    title: "Suporte | Ritmo",
    description: "Centro de ajuda Ritmo — perguntas frequentes, contacto e SLA de suporte.",
};

const faqItems = [
    {
        question: "Como criar a minha primeira cobrança?",
        answer:
            'Aceda ao painel, clique em "Novo Orçamento", preencha os dados do cliente (nome, email, empresa) e os detalhes do orçamento (valor, referência). Pode anexar a proposta em PDF ou adicionar um link. Depois de guardar, marque como "Enviado" quando enviar ao cliente.',
        category: "Onboarding",
    },
    {
        question: "Como adicionar clientes?",
        answer:
            "Os clientes são criados automaticamente quando regista um novo orçamento. Basta preencher o nome, email e empresa na criação do orçamento. Também pode gerir contactos na secção de definições.",
        category: "Onboarding",
    },
    {
        question: "Que métodos de pagamento são suportados?",
        answer:
            "Aceitamos cartão de crédito e débito (Visa, Mastercard) através do Stripe. Os pagamentos são processados de forma segura e encriptada. Nunca armazenamos os dados do seu cartão nos nossos servidores.",
        category: "Billing",
    },
    {
        question: "Como altero o meu plano (upgrade/downgrade)?",
        answer:
            'Aceda a Definições → Faturação. Verá o seu plano atual e as opções disponíveis. O upgrade é imediato e o valor é pro-rata. O downgrade entra em vigor no próximo ciclo de faturação.',
        category: "Billing",
    },
    {
        question: "Como cancelo a minha subscrição?",
        answer:
            "Pode cancelar a qualquer momento em Definições → Faturação → Cancelar plano. O acesso aos recursos pagos mantém-se até ao final do período já pago. Os seus dados ficam disponíveis durante 30 dias após o cancelamento.",
        category: "Billing",
    },
    {
        question: "Os meus dados estão seguros?",
        answer:
            "Sim. Utilizamos encriptação TLS em todas as comunicações, os dados são armazenados em servidores na UE (Neon PostgreSQL), e seguimos as melhores práticas de segurança do RGPD. Consulte a nossa Política de Privacidade para mais detalhes.",
        category: "Segurança",
    },
    {
        question: "Como exporto os meus dados?",
        answer:
            "Pode exportar os seus orçamentos e contactos em formato CSV a partir da página de orçamentos. Se precisar de uma exportação completa dos seus dados (direito de portabilidade RGPD), contacte-nos por email.",
        category: "Funcionalidade",
    },
    {
        question: "Posso adicionar mais utilizadores à minha conta?",
        answer:
            "Sim. O número de utilizadores depende do seu plano: Free (1), Starter (2), Pro (5). Pode adicionar utilizadores em Definições → Utilizadores. Para mais utilizadores, considere fazer upgrade ou contacte-nos para um plano personalizado.",
        category: "Funcionalidade",
    },
    {
        question: "Qual é a vossa política de reembolso?",
        answer:
            "Oferecemos um trial de 14 dias sem cartão para que possa avaliar o serviço. Após a subscrição, não efetuamos reembolsos por períodos não utilizados. O cancelamento impede cobranças futuras e mantém o acesso até ao fim do período pago.",
        category: "Billing",
    },
    {
        question: "Como contacto o suporte?",
        answer:
            "Tem duas formas: (1) Chat — clique no ícone no canto inferior direito de qualquer página; (2) Email — envie para suporte@useritmo.pt. O nosso horário de suporte é Seg-Sex, 9h-18h (hora de Portugal).",
        category: "Meta",
    },
];

export default function SuportePage() {
    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <div className="container-app py-16">
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar à página inicial
                </Link>

                {/* Page Title */}
                <h1 className="mb-2 text-3xl font-bold">Centro de Ajuda</h1>
                <p className="mb-12 text-[var(--color-muted-foreground)]">
                    Encontre respostas às perguntas mais frequentes ou contacte-nos directamente.
                </p>

                {/* SLA / Contact Section */}
                <section className="mb-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-8">
                    <h2 className="mb-6 text-xl font-semibold text-[var(--color-foreground)]">
                        Suporte Ritmo
                    </h2>
                    <p className="mb-6 text-[var(--color-muted-foreground)] leading-relaxed">
                        Estamos aqui para ajudar. Respondemos a todos os pedidos em horário útil
                        (Seg-Sex, 9h-18h) com um tempo médio de resposta inferior a 4 horas.
                    </p>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Chat */}
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                                <MessageCircle className="h-5 w-5 text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <h3 className="font-medium text-[var(--color-foreground)]">Chat</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Clique no ícone no canto inferior direito
                                </p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                                <Mail className="h-5 w-5 text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <h3 className="font-medium text-[var(--color-foreground)]">Email</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    <a
                                        href="mailto:suporte@useritmo.pt"
                                        className="text-[var(--color-primary)] hover:underline"
                                    >
                                        suporte@useritmo.pt
                                    </a>
                                </p>
                            </div>
                        </div>

                        {/* Horário */}
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                                <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <h3 className="font-medium text-[var(--color-foreground)]">Horário</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Seg-Sex, 09:00-18:00 (WET/WEST)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Emergency note */}
                    <div className="mt-6 flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                            <strong className="text-[var(--color-foreground)]">Emergências</strong> (plataforma em baixo, problema de pagamento): indique
                            &quot;URGENTE&quot; no assunto do email.
                        </p>
                    </div>
                </section>

                {/* SLA Table */}
                <section className="mb-16">
                    <h2 className="mb-6 text-xl font-semibold text-[var(--color-foreground)]">
                        Tempos de Resposta (SLA)
                    </h2>
                    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
                                    <th className="px-4 py-3 text-left font-medium text-[var(--color-foreground)]">Prioridade</th>
                                    <th className="px-4 py-3 text-left font-medium text-[var(--color-foreground)]">Descrição</th>
                                    <th className="px-4 py-3 text-left font-medium text-[var(--color-foreground)]">1ª Resposta</th>
                                    <th className="px-4 py-3 text-left font-medium text-[var(--color-foreground)]">Resolução</th>
                                </tr>
                            </thead>
                            <tbody className="text-[var(--color-muted-foreground)]">
                                <tr className="border-b border-[var(--color-border)]">
                                    <td className="px-4 py-3 font-medium text-red-600">P0 — Crítico</td>
                                    <td className="px-4 py-3">Plataforma indisponível, dados comprometidos</td>
                                    <td className="px-4 py-3">&lt; 1 hora</td>
                                    <td className="px-4 py-3">&lt; 4 horas</td>
                                </tr>
                                <tr className="border-b border-[var(--color-border)]">
                                    <td className="px-4 py-3 font-medium text-amber-600">P1 — Alto</td>
                                    <td className="px-4 py-3">Funcionalidade core bloqueada</td>
                                    <td className="px-4 py-3">&lt; 4 horas úteis</td>
                                    <td className="px-4 py-3">&lt; 24 horas úteis</td>
                                </tr>
                                <tr className="border-b border-[var(--color-border)]">
                                    <td className="px-4 py-3 font-medium text-yellow-600">P2 — Médio</td>
                                    <td className="px-4 py-3">Funcionalidade parcial, workaround existe</td>
                                    <td className="px-4 py-3">&lt; 8 horas úteis</td>
                                    <td className="px-4 py-3">&lt; 48 horas úteis</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-[var(--color-muted-foreground)]">P3 — Baixo</td>
                                    <td className="px-4 py-3">Dúvida, pedido de feature, cosmético</td>
                                    <td className="px-4 py-3">&lt; 24 horas úteis</td>
                                    <td className="px-4 py-3">&lt; 5 dias úteis</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="mb-16">
                    <h2 className="mb-6 text-xl font-semibold text-[var(--color-foreground)]">
                        Perguntas Frequentes
                    </h2>

                    <Accordion type="single" collapsible className="w-full space-y-3">
                        {faqItems.map((item, index) => (
                            <AccordionItem
                                key={`faq-${index}`}
                                value={`faq-${index}`}
                                className="rounded-lg border border-[var(--color-border)] px-2 overflow-hidden"
                            >
                                <AccordionTrigger className="px-4 py-4 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-xs font-medium text-[var(--color-muted-foreground)]">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-medium text-[var(--color-foreground)]">
                                            {item.question}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                                    {item.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>

                {/* Related Links */}
                <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-6">
                    <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
                        Documentos Relacionados
                    </h2>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/privacidade" className="text-[var(--color-primary)] hover:underline">
                                Política de Privacidade
                            </Link>
                        </li>
                        <li>
                            <Link href="/termos" className="text-[var(--color-primary)] hover:underline">
                                Termos e Condições
                            </Link>
                        </li>
                        <li>
                            <Link href="/cookies" className="text-[var(--color-primary)] hover:underline">
                                Política de Cookies
                            </Link>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
