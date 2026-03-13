import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade | Ritmo",
  description: "Política de privacidade e proteção de dados do Ritmo",
};

export default function PrivacidadePage() {
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

        <h1 className="mb-2 text-3xl font-bold">Política de Privacidade</h1>
        <p className="mb-8 text-[var(--color-muted-foreground)]">
          <strong className="text-[var(--color-foreground)]">Última atualização:</strong> Março 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-[var(--color-muted-foreground)]">
          {/* Identificação do Responsável */}
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
              Responsável pelo Tratamento
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <strong className="text-[var(--color-foreground)]">Nome Legal:</strong> [NOME LEGAL
                DA EMPRESA]
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">NIF:</strong> [NIF]
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Sede:</strong> [MORADA COMPLETA]
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Email DPO:</strong>{" "}
                <a
                  href="mailto:privacidade@useritmo.pt"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  privacidade@useritmo.pt
                </a>
              </li>
            </ul>
          </section>

          {/* 1. Introdução */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              1. Introdução
            </h2>
            <p className="mb-3">
              A presente Política de Privacidade descreve como recolhemos, utilizamos, armazenamos e
              protegemos os seus dados pessoais quando utiliza a plataforma Ritmo.
            </p>
            <p>
              Estamos empenhados em proteger a sua privacidade e em cumprir o Regulamento Geral
              sobre a Proteção de Dados (RGPD - Regulamento UE 2016/679) e demais legislação
              aplicável em matéria de proteção de dados.
            </p>
          </section>

          {/* 2. Dados Recolhidos */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              2. Dados Pessoais que Recolhemos
            </h2>
            <p className="mb-3">
              Recolhemos apenas os dados estritamente necessários para prestar o serviço:
            </p>

            <h3 className="mb-2 text-lg font-medium text-[var(--color-foreground)]">
              2.1 Dados de Identificação
            </h3>
            <ul className="mb-4 list-disc space-y-1 pl-6">
              <li>Nome e apelido</li>
              <li>Endereço de email</li>
              <li>Nome da empresa (opcional)</li>
              <li>Cargo/função (opcional)</li>
            </ul>

            <h3 className="mb-2 text-lg font-medium text-[var(--color-foreground)]">
              2.2 Dados de Utilização
            </h3>
            <ul className="mb-4 list-disc space-y-1 pl-6">
              <li>Orçamentos criados e respetivos dados (cliente, valor, datas)</li>
              <li>Contactos de clientes introduzidos na plataforma</li>
              <li>Templates de email personalizados</li>
              <li>Histórico de ações e follow-ups</li>
              <li>Notas e etiquetas associadas a orçamentos</li>
            </ul>

            <h3 className="mb-2 text-lg font-medium text-[var(--color-foreground)]">
              2.3 Dados Técnicos
            </h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>Endereço IP (para segurança)</li>
              <li>Tipo de browser e dispositivo</li>
              <li>Data e hora de acesso</li>
              <li>
                Cookies de sessão (ver{" "}
                <Link href="/cookies" className="text-[var(--color-primary)] hover:underline">
                  Política de Cookies
                </Link>
                )
              </li>
            </ul>
          </section>

          {/* 3. Finalidades */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              3. Finalidades do Tratamento
            </h2>
            <p className="mb-3">Utilizamos os seus dados pessoais para as seguintes finalidades:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--color-foreground)]">Prestação do Serviço:</strong>{" "}
                Gestão de orçamentos, envio de follow-ups automáticos, captura de propostas via BCC
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Gestão da Conta:</strong>{" "}
                Autenticação, gestão de subscrição, faturação
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Comunicações:</strong>{" "}
                Notificações sobre o serviço, atualizações importantes, suporte técnico
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Segurança:</strong> Prevenção de
                fraude, proteção contra acessos não autorizados
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Melhorias:</strong> Análise
                agregada e anónima para melhorar o serviço
              </li>
            </ul>
          </section>

          {/* 4. Base Legal */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              4. Base Legal para o Tratamento
            </h2>
            <p className="mb-3">
              O tratamento dos seus dados pessoais baseia-se nas seguintes bases legais (Art. 6º
              RGPD):
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--color-foreground)]">Execução de Contrato:</strong> O
                tratamento é necessário para a prestação do serviço contratado
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Interesses Legítimos:</strong>{" "}
                Segurança do serviço e prevenção de fraude
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Obrigação Legal:</strong>{" "}
                Cumprimento de obrigações fiscais e legais
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Consentimento:</strong> Quando
                aplicável, para comunicações de marketing (pode ser retirado a qualquer momento)
              </li>
            </ul>
          </section>

          {/* 5. Partilha de Dados */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              5. Subprocessadores e Partilha de Dados
            </h2>
            <p className="mb-3">
              <strong className="text-[var(--color-foreground)]">Não vendemos</strong> os seus dados
              pessoais nem os partilhamos com terceiros para fins de marketing ou publicidade.
            </p>
            <p className="mb-3">
              Partilhamos dados com os seguintes subprocessadores, sempre ao abrigo de Acordos de
              Processamento de Dados (DPA) adequados:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="py-2 pr-4 text-left font-medium text-[var(--color-foreground)]">
                      Subprocessador
                    </th>
                    <th className="py-2 pr-4 text-left font-medium text-[var(--color-foreground)]">
                      Finalidade
                    </th>
                    <th className="py-2 text-left font-medium text-[var(--color-foreground)]">
                      Localização
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Neon Inc.
                    </td>
                    <td className="py-2 pr-4">
                      Base de dados PostgreSQL principal (guarda todos os dados de utilizadores)
                    </td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Google LLC
                    </td>
                    <td className="py-2 pr-4">
                      Autenticação OAuth (recebe email, nome e foto do utilizador)
                    </td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Vercel Inc.
                    </td>
                    <td className="py-2 pr-4">Hosting da interface web e serverless functions</td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Stripe, Inc.
                    </td>
                    <td className="py-2 pr-4">
                      Processamento de pagamentos e gestão de subscrições
                    </td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Supabase, Inc.
                    </td>
                    <td className="py-2 pr-4">Armazenamento de ficheiros (propostas PDF)</td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Resend, Inc.
                    </td>
                    <td className="py-2 pr-4">
                      Envio de emails transacionais (follow-ups, notificações)
                    </td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Upstash Inc.
                    </td>
                    <td className="py-2 pr-4">Rate limiting (processa endereços IP)</td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Mailgun (Sinch)
                    </td>
                    <td className="py-2 pr-4">
                      Processamento de email inbound (captura BCC de propostas)
                    </td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Cloudflare Inc.
                    </td>
                    <td className="py-2 pr-4">Email routing inbound via Workers</td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-[var(--color-foreground)]">
                      Sentry, Inc.
                    </td>
                    <td className="py-2 pr-4">Monitorização de erros e performance</td>
                    <td className="py-2">EUA (SCC)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs">
              SCC = Standard Contractual Clauses (Cláusulas Contratuais-Tipo) aprovadas pela
              Comissão Europeia (Art. 46.º RGPD). Todos os subprocessadores estão localizados nos
              EUA — as transferências são efetuadas ao abrigo de SCC.
            </p>
            <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4">
              <h3 className="mb-3 text-lg font-medium text-[var(--color-foreground)]">
                5.1 Acordo de Processamento de Dados (DPA)
              </h3>
              <p className="mb-3">
                Quando utiliza o Ritmo para gerir orçamentos e cobranças dos seus clientes, o Ritmo
                atua como <strong className="text-[var(--color-foreground)]">Processador</strong>{" "}
                dos dados pessoais dos seus clientes, sendo a sua empresa o{" "}
                <strong className="text-[var(--color-foreground)]">
                  Responsável pelo Tratamento
                </strong>{" "}
                desses dados (Art. 28.º RGPD).
              </p>
              <p className="mb-3">Neste contexto, o Ritmo compromete-se a:</p>
              <ul className="mb-3 list-disc space-y-1 pl-6">
                <li>
                  Tratar os dados pessoais apenas segundo as instruções documentadas do Responsável
                </li>
                <li>
                  Garantir que as pessoas autorizadas a tratar os dados estão sujeitas a obrigações
                  de confidencialidade
                </li>
                <li>
                  Implementar as medidas técnicas e organizativas adequadas (conforme secção 7)
                </li>
                <li>
                  Não recorrer a outro subprocessador sem autorização prévia por escrito — a lista
                  acima constitui a autorização geral; alterações serão notificadas com 30 dias de
                  antecedência
                </li>
                <li>Assistir o Responsável no cumprimento dos direitos dos titulares dos dados</li>
                <li>
                  Eliminar ou devolver todos os dados pessoais após o término da prestação de
                  serviços, a pedido do Responsável
                </li>
                <li>
                  Disponibilizar ao Responsável todas as informações necessárias para demonstrar o
                  cumprimento das obrigações do Art. 28.º RGPD
                </li>
              </ul>
              <p className="text-sm">
                Clientes com plano pago podem solicitar um DPA formal assinado contactando{" "}
                <a
                  href="mailto:privacidade@useritmo.pt"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  privacidade@useritmo.pt
                </a>
                .
              </p>
            </div>
          </section>

          {/* 6. Retenção */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              6. Período de Conservação
            </h2>
            <p className="mb-3">
              Conservamos os seus dados pessoais apenas pelo tempo necessário para as finalidades
              para as quais foram recolhidos:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-[var(--color-foreground)]">
                  Dados da conta e utilização:
                </strong>{" "}
                Enquanto a conta estiver ativa + 1 ano após encerramento
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Dados de faturação:</strong> 10
                anos (obrigação fiscal — art. 52.º CIRS)
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Logs de segurança:</strong> 12
                meses
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Emails de comunicação:</strong> 2
                anos
              </li>
            </ul>
            <p className="mt-3">
              Após o período de retenção, os dados são eliminados de forma segura ou anonimizados
              irreversivelmente. Pode solicitar exportação dos seus dados antes do encerramento da
              conta.
            </p>
          </section>

          {/* 7. Segurança */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              7. Segurança dos Dados
            </h2>
            <p className="mb-3">
              Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Encriptação em trânsito (HTTPS/TLS) e em repouso</li>
              <li>Passwords encriptadas com bcrypt</li>
              <li>Acesso restrito com autenticação multi-fator</li>
              <li>Backups regulares e plano de recuperação de desastres</li>
              <li>Monitorização contínua de segurança</li>
              <li>Revisões periódicas de segurança</li>
            </ul>
          </section>

          {/* 8. Direitos */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              8. Os Seus Direitos (RGPD)
            </h2>
            <p className="mb-3">
              Nos termos do RGPD, tem os seguintes direitos relativamente aos seus dados pessoais:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--color-foreground)]">Direito de Acesso:</strong> Obter
                confirmação e cópia dos seus dados pessoais
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Direito de Retificação:</strong>{" "}
                Corrigir dados inexatos ou incompletos
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Direito ao Apagamento:</strong>{" "}
                Solicitar a eliminação dos seus dados (&quot;direito a ser esquecido&quot;)
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Direito à Limitação:</strong>{" "}
                Restringir o tratamento em determinadas circunstâncias
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Direito à Portabilidade:</strong>{" "}
                Receber os seus dados num formato estruturado e legível por máquina
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Direito de Oposição:</strong>{" "}
                Opor-se ao tratamento baseado em interesses legítimos
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">
                  Direito de Retirar Consentimento:
                </strong>{" "}
                Quando o tratamento se baseia em consentimento
              </li>
            </ul>
            <p className="mt-3">
              Para exercer qualquer destes direitos, contacte-nos em{" "}
              <a
                href="mailto:privacidade@useritmo.pt"
                className="text-[var(--color-primary)] hover:underline"
              >
                privacidade@useritmo.pt
              </a>
              . Responderemos no prazo máximo de 30 dias.
            </p>
          </section>

          {/* 9. Reclamações */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              9. Direito de Reclamação
            </h2>
            <p className="mb-3">
              Se considerar que o tratamento dos seus dados pessoais viola o RGPD, tem o direito de
              apresentar uma reclamação junto da autoridade de controlo:
            </p>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4">
              <p className="font-medium text-[var(--color-foreground)]">
                Comissão Nacional de Proteção de Dados (CNPD)
              </p>
              <p className="text-sm">Av. D. Carlos I, 134 - 1.º, 1200-651 Lisboa</p>
              <p className="text-sm">
                Website:{" "}
                <a
                  href="https://www.cnpd.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  www.cnpd.pt
                </a>
              </p>
            </div>
          </section>

          {/* 10. Alterações */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              10. Alterações a Esta Política
            </h2>
            <p className="mb-3">
              Podemos atualizar esta Política de Privacidade periodicamente. Alterações
              significativas serão notificadas por email ou através da plataforma.
            </p>
            <p>
              Recomendamos que reveja esta página regularmente. A data da última atualização está
              indicada no topo desta página.
            </p>
          </section>

          {/* 11. Contacto */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
              11. Contacto
            </h2>
            <p className="mb-3">
              Para questões sobre esta Política de Privacidade ou sobre o tratamento dos seus dados
              pessoais:
            </p>
            <ul className="space-y-1">
              <li>
                <strong className="text-[var(--color-foreground)]">Email:</strong>{" "}
                <a
                  href="mailto:privacidade@useritmo.pt"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  privacidade@useritmo.pt
                </a>
              </li>
              <li>
                <strong className="text-[var(--color-foreground)]">Website:</strong>{" "}
                <a
                  href="https://useritmo.pt"
                  className="text-[var(--color-primary)] hover:underline"
                >
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
                <Link href="/termos" className="text-[var(--color-primary)] hover:underline">
                  Termos e Condições do Serviço
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
