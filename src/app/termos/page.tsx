import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Termos e Condições | Ritmo",
    description: "Termos e condições de utilização do serviço Ritmo",
};

export default function TermosPage() {
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

                <h1 className="mb-2 text-3xl font-bold">Termos e Condições do Serviço</h1>
                <p className="mb-8 text-[var(--color-muted-foreground)]">
                    <strong className="text-[var(--color-foreground)]">Última atualização:</strong> Janeiro 2026
                </p>

                <div className="prose prose-invert max-w-none space-y-8 text-[var(--color-muted-foreground)]">
                    {/* Identificação da Entidade */}
                    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-6">
                        <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
                            Identificação da Entidade
                        </h2>
                        <ul className="space-y-2 text-sm">
                            <li><strong className="text-[var(--color-foreground)]">Nome Legal:</strong> [NOME LEGAL DA EMPRESA]</li>
                            <li><strong className="text-[var(--color-foreground)]">NIF:</strong> [NIF]</li>
                            <li><strong className="text-[var(--color-foreground)]">Sede:</strong> [MORADA COMPLETA]</li>
                            <li><strong className="text-[var(--color-foreground)]">Email:</strong>{" "}
                                <a href="mailto:geral@useritmo.pt" className="text-[var(--color-primary)] hover:underline">
                                    geral@useritmo.pt
                                </a>
                            </li>
                            <li><strong className="text-[var(--color-foreground)]">Website:</strong>{" "}
                                <a href="https://useritmo.pt" className="text-[var(--color-primary)] hover:underline">
                                    useritmo.pt
                                </a>
                            </li>
                        </ul>
                    </section>

                    {/* 1. Objeto e Aceitação */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            1. Objeto e Aceitação dos Termos
                        </h2>
                        <p className="mb-3">
                            Os presentes Termos e Condições regulam o acesso e utilização da plataforma Ritmo
                            (&quot;Serviço&quot;), uma ferramenta de gestão de follow-up de orçamentos para
                            pequenas e médias empresas.
                        </p>
                        <p className="mb-3">
                            Ao criar uma conta ou utilizar o Serviço, o utilizador declara ter lido, compreendido
                            e aceite integralmente estes Termos. Se não concordar com alguma disposição, não deve
                            utilizar a plataforma.
                        </p>
                        <p>
                            A utilização do Serviço implica igualmente a aceitação da nossa{" "}
                            <Link href="/privacidade" className="text-[var(--color-primary)] hover:underline">
                                Política de Privacidade
                            </Link>{" "}
                            e{" "}
                            <Link href="/cookies" className="text-[var(--color-primary)] hover:underline">
                                Política de Cookies
                            </Link>.
                        </p>
                    </section>

                    {/* 2. Descrição do Serviço */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            2. Descrição do Serviço
                        </h2>
                        <p className="mb-3">
                            O Ritmo é uma plataforma SaaS (Software as a Service) que permite:
                        </p>
                        <ul className="mb-3 list-disc space-y-1 pl-6">
                            <li>Criar e gerir orçamentos comerciais</li>
                            <li>Automatizar o envio de emails de follow-up</li>
                            <li>Acompanhar o estado de propostas enviadas</li>
                            <li>Capturar propostas via email (BCC)</li>
                            <li>Gerar relatórios e métricas de desempenho</li>
                        </ul>
                        <p>
                            O Serviço está disponível através da web em{" "}
                            <a href="https://useritmo.pt" className="text-[var(--color-primary)] hover:underline">
                                useritmo.pt
                            </a>.
                        </p>
                    </section>

                    {/* 3. Registo e Conta */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            3. Registo e Conta de Utilizador
                        </h2>
                        <p className="mb-3">
                            Para utilizar o Serviço, é necessário criar uma conta fornecendo informações
                            verdadeiras e atualizadas. O utilizador é responsável por:
                        </p>
                        <ul className="mb-3 list-disc space-y-1 pl-6">
                            <li>Manter a confidencialidade das credenciais de acesso</li>
                            <li>Notificar imediatamente qualquer uso não autorizado da conta</li>
                            <li>Todas as atividades realizadas através da sua conta</li>
                            <li>Manter os dados de contacto atualizados</li>
                        </ul>
                        <p>
                            Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos
                            ou que apresentem atividade suspeita.
                        </p>
                    </section>

                    {/* 4. Planos e Pagamentos */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            4. Planos, Preços e Pagamentos
                        </h2>
                        <p className="mb-3">
                            O Serviço está disponível em diferentes planos, incluindo um plano gratuito
                            com funcionalidades limitadas e planos pagos com recursos adicionais.
                        </p>
                        <h3 className="mb-2 text-lg font-medium text-[var(--color-foreground)]">
                            4.1 Período de Trial
                        </h3>
                        <p className="mb-3">
                            Novos utilizadores têm acesso a um período de trial de 14 dias sem necessidade
                            de cartão de crédito. Após o trial, a conta reverte para o plano gratuito ou
                            pode fazer upgrade para um plano pago.
                        </p>
                        <h3 className="mb-2 text-lg font-medium text-[var(--color-foreground)]">
                            4.2 Faturação
                        </h3>
                        <p className="mb-3">
                            Os planos pagos são faturados mensalmente, com cobrança automática no início
                            de cada período. Os preços apresentados incluem IVA à taxa legal em vigor.
                        </p>
                        <h3 className="mb-2 text-lg font-medium text-[var(--color-foreground)]">
                            4.3 Cancelamento
                        </h3>
                        <p>
                            Pode cancelar a subscrição a qualquer momento através das definições da conta.
                            O acesso aos recursos pagos mantém-se até ao final do período já pago.
                            Não são efetuados reembolsos por períodos não utilizados.
                        </p>
                    </section>

                    {/* 5. Uso Aceitável */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            5. Uso Aceitável
                        </h2>
                        <p className="mb-3">
                            O utilizador compromete-se a utilizar o Serviço de forma lícita e de acordo
                            com estes Termos. É expressamente proibido:
                        </p>
                        <ul className="mb-3 list-disc space-y-1 pl-6">
                            <li>Enviar spam ou comunicações comerciais não solicitadas</li>
                            <li>Utilizar o Serviço para atividades ilegais ou fraudulentas</li>
                            <li>Tentar aceder a contas ou dados de outros utilizadores</li>
                            <li>Interferir com a operação normal do Serviço</li>
                            <li>Fazer engenharia reversa ou tentar extrair o código-fonte</li>
                            <li>Revender ou sublicenciar o acesso ao Serviço</li>
                            <li>Violar direitos de propriedade intelectual de terceiros</li>
                        </ul>
                        <p>
                            A violação destas regras pode resultar na suspensão ou encerramento imediato
                            da conta, sem direito a reembolso.
                        </p>
                    </section>

                    {/* 6. Propriedade Intelectual */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            6. Propriedade Intelectual
                        </h2>
                        <p className="mb-3">
                            Todo o conteúdo do Serviço, incluindo mas não limitado a software, design,
                            logótipos, textos e gráficos, é propriedade de [NOME LEGAL DA EMPRESA] ou
                            dos seus licenciadores, estando protegido por direitos de autor e outras
                            leis de propriedade intelectual.
                        </p>
                        <p>
                            O utilizador mantém todos os direitos sobre os dados e conteúdos que introduz
                            na plataforma. Ao utilizar o Serviço, concede-nos uma licença limitada para
                            processar esses dados exclusivamente para a prestação do Serviço.
                        </p>
                    </section>

                    {/* 7. Proteção de Dados */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            7. Proteção de Dados
                        </h2>
                        <p className="mb-3">
                            A recolha e tratamento de dados pessoais é efetuada em conformidade com o
                            Regulamento Geral sobre a Proteção de Dados (RGPD) e demais legislação aplicável.
                        </p>
                        <p>
                            Para informações detalhadas sobre como tratamos os seus dados, consulte a nossa{" "}
                            <Link href="/privacidade" className="text-[var(--color-primary)] hover:underline">
                                Política de Privacidade
                            </Link>.
                        </p>
                    </section>

                    {/* 8. Disponibilidade e Suporte */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            8. Disponibilidade e Suporte
                        </h2>
                        <p className="mb-3">
                            Esforçamo-nos por manter o Serviço disponível 24 horas por dia, 7 dias por semana.
                            Contudo, não garantimos disponibilidade ininterrupta e podemos efetuar manutenções
                            programadas ou de emergência.
                        </p>
                        <p>
                            O suporte técnico está disponível por email em{" "}
                            <a href="mailto:suporte@useritmo.pt" className="text-[var(--color-primary)] hover:underline">
                                suporte@useritmo.pt
                            </a>{" "}
                            em dias úteis.
                        </p>
                    </section>

                    {/* 9. Limitação de Responsabilidade */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            9. Limitação de Responsabilidade
                        </h2>
                        <p className="mb-3">
                            O Serviço é fornecido &quot;tal como está&quot; e &quot;conforme disponível&quot;.
                            Na máxima extensão permitida por lei, não garantimos:
                        </p>
                        <ul className="mb-3 list-disc space-y-1 pl-6">
                            <li>Que o Serviço será ininterrupto ou livre de erros</li>
                            <li>Resultados comerciais específicos da utilização do Serviço</li>
                            <li>A adequação do Serviço a necessidades particulares</li>
                        </ul>
                        <p>
                            Em caso algum seremos responsáveis por danos indiretos, incidentais, especiais
                            ou consequenciais, incluindo perda de lucros, dados ou oportunidades de negócio.
                        </p>
                    </section>

                    {/* 10. Alterações aos Termos */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            10. Alterações aos Termos
                        </h2>
                        <p className="mb-3">
                            Reservamo-nos o direito de modificar estes Termos a qualquer momento.
                            As alterações serão publicadas nesta página com indicação da data de atualização.
                        </p>
                        <p>
                            Alterações significativas serão notificadas por email ou através da plataforma
                            com pelo menos 30 dias de antecedência. A continuação da utilização do Serviço
                            após as alterações constitui aceitação dos novos Termos.
                        </p>
                    </section>

                    {/* 11. Lei Aplicável */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            11. Lei Aplicável e Jurisdição
                        </h2>
                        <p className="mb-3">
                            Estes Termos são regidos pela lei portuguesa. Para a resolução de qualquer
                            litígio decorrente da utilização do Serviço, as partes submetem-se à jurisdição
                            exclusiva dos tribunais portugueses, com renúncia a qualquer outro foro.
                        </p>
                        <p>
                            Em caso de conflito entre versões destes Termos em diferentes idiomas,
                            prevalece a versão em português.
                        </p>
                    </section>

                    {/* 12. Disposições Gerais */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            12. Disposições Gerais
                        </h2>
                        <p className="mb-3">
                            Se alguma disposição destes Termos for considerada inválida ou inexequível,
                            as restantes disposições mantêm-se em pleno vigor.
                        </p>
                        <p>
                            A não aplicação de qualquer direito ou disposição destes Termos não constitui
                            renúncia a esse direito ou disposição.
                        </p>
                    </section>

                    {/* 13. Contacto */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            13. Contacto
                        </h2>
                        <p className="mb-3">
                            Para questões sobre estes Termos e Condições, contacte-nos através de:
                        </p>
                        <ul className="space-y-1">
                            <li>
                                <strong className="text-[var(--color-foreground)]">Email:</strong>{" "}
                                <a href="mailto:geral@useritmo.pt?subject=Termos" className="text-[var(--color-primary)] hover:underline">
                                    geral@useritmo.pt
                                </a>
                            </li>
                            <li>
                                <strong className="text-[var(--color-foreground)]">Website:</strong>{" "}
                                <a href="https://useritmo.pt" className="text-[var(--color-primary)] hover:underline">
                                    useritmo.pt
                                </a>
                            </li>
                        </ul>
                    </section>

                    {/* Links relacionados */}
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
                                <Link href="/cookies" className="text-[var(--color-primary)] hover:underline">
                                    Política de Cookies
                                </Link>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
