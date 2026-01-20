import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackModal } from "@/components/feedback";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
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
        <html lang="pt-PT" suppressHydrationWarning>
            <body className={`${inter.variable} antialiased`}>
                <Providers>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                        <Toaster />
                        <FeedbackModal />
                    </ThemeProvider>
                </Providers>
            </body>
        </html>
    );
}
