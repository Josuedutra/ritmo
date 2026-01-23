"use client";

import Link from "next/link";
import { XCircle, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { SystemPageLayout } from "@/components/layout/system-page-layout";

export default function BillingCancelPage() {
    return (
        <SystemPageLayout
            icon={<XCircle className="h-10 w-10 text-white" />}
            iconBg="bg-orange-500"
            title="Checkout cancelado"
            subtitle="Nenhuma cobrança foi efetuada."
        >
            <div className="space-y-3">
                <Link href="/settings/billing" className="block">
                    <Button variant="brand" size="lg" className="w-full gap-2 text-base">
                        <RefreshCw className="h-5 w-5" />
                        Tentar novamente
                    </Button>
                </Link>
                <Link href="/dashboard" className="block">
                    <Button variant="outline" className="w-full gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Voltar ao Dashboard
                    </Button>
                </Link>
            </div>
        </SystemPageLayout>
    );
}
