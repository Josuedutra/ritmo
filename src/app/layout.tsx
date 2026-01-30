import type { Metadata } from "next";
import { Roboto, Comfortaa } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackModal } from "@/components/feedback";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import "./globals.css";

const roboto = Roboto({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    variable: "--font-roboto",
});

const comfortaa = Comfortaa({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-comfortaa",
});

export const metadata: Metadata = {
    metadataBase: new URL('https://ritmo.pt'),
    title: {
        default: "Ritmo - Follow-up Inteligente para Orçamentos",
        template: "%s | Ritmo"
    },
    description: "Cadência automática + painel + envio para follow-up de orçamentos B2B. Recupere propostas sem resposta.",
    keywords: ["follow-up", "orçamentos", "CRM", "vendas", "B2B", "automação de vendas"],
    openGraph: {
        type: 'website',
        locale: 'pt_PT',
        url: 'https://ritmo.pt',
        siteName: 'Ritmo',
        images: [
            {
                url: '/brand/r-3d-transparent.png', // Using existing brand asset as fallback until specific OG image is created
                width: 1200,
                height: 630,
                alt: 'Ritmo - Follow-up de Orçamentos',
            },
        ],
    },
    alternates: {
        canonical: '/',
    },
    robots: {
        index: true,
        follow: true,
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-PT" suppressHydrationWarning>
            <body className={`${roboto.variable} ${comfortaa.variable} antialiased`}>
                <Providers>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="light"
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
