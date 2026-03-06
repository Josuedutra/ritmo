import type { Metadata } from "next";
import { Roboto, Comfortaa } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackModal } from "@/components/feedback";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { CrispWidget } from "@/components/crisp-widget";
import { CookieBanner } from "@/components/marketing";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
});

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://useritmo.pt"),
  title: {
    default: "Ritmo — Follow-up de Orçamentos para PMEs | Recupere Propostas",
    template: "%s | Ritmo",
  },
  description:
    "Acompanhe todos os seus orçamentos sem resposta. O Ritmo envia follow-ups automáticos e diz-lhe quando ligar — sem CRM, sem mudar o seu processo.",
  keywords: ["follow-up", "orçamentos", "CRM", "vendas", "B2B", "automação de vendas"],
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: "https://useritmo.pt",
    siteName: "Ritmo",
    images: [
      {
        url: "/brand/r-3d-transparent.png", // Using existing brand asset as fallback until specific OG image is created
        width: 1200,
        height: 630,
        alt: "Ritmo - Follow-up de Orçamentos",
      },
    ],
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
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
          <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
            {children}
            <Toaster />
            <FeedbackModal />
            <CrispWidget />
            <CookieBanner />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
