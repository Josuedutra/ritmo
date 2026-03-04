import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Programa de Parceiros Ritmo — Para Contabilistas",
  description:
    "Referencie o Ritmo aos seus clientes PME e receba 20% de comissão recorrente. Gestão de cobranças automática. Registe-se gratuitamente como parceiro.",
  alternates: {
    canonical: "/partners",
  },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
