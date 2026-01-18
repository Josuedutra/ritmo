import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackModal } from "@/components/feedback";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "Ritmo - Follow-up Inteligente para Orçamentos",
    description: "Cadência automática + painel + envio para follow-up de orçamentos B2B",
    keywords: ["follow-up", "orçamentos", "CRM", "vendas", "B2B"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-PT" className="dark">
            <body className={`${inter.variable} antialiased`}>
                {children}
                <Toaster />
                <FeedbackModal />
            </body>
        </html>
    );
}
