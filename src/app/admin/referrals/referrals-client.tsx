"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, toast } from "@/components/ui";
import {
    Users,
    Link as LinkIcon,
    TrendingUp,
    DollarSign,
    Plus,
    Copy,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    RefreshCw,
    Download,
} from "lucide-react";

interface Partner {
    id: string;
    name: string;
    type: string;
    contactName: string | null;
    contactEmail: string | null;
    website: string | null;
    status: "ACTIVE" | "PAUSED";
    defaultBoosterRateBps: number;
    createdAt: string;
    stats: {
        linksCount: number;
        attributionsCount: number;
        boostersCount: number;
        totalBoosterCents: number;
        pendingBoosterCents: number;
        pendingBoostersCount: number;
    };
}

interface ReferralLink {
    id: string;
    partnerId: string;
    code: string;
    landingPath: string;
    fullUrl: string;
    attributionsCount: number;
    createdAt: string;
    partner: {
        id: string;
        name: string;
        status: string;
    };
}

interface Attribution {
    id: string;
    partnerId: string;
    organizationId: string;
    status: string;
    signupAt: string | null;
    convertedAt: string | null;
    createdAt: string;
    partner: { id: string; name: string };
    referralLink: { id: string; code: string } | null;
    organization: {
        id: string;
        name: string;
        subscription: { planId: string; status: string } | null;
    } | null;
}

interface Booster {
    id: string;
    partnerId: string;
    organizationId: string;
    amountCents: number;
    currency: string;
    rateBps: number;
    status: "PENDING" | "APPROVED" | "PAID" | "VOID";
    stripeInvoiceId: string | null;
    createdAt: string;
    partner: { id: string; name: string };
    organization: { id: string; name: string } | null;
}

type Tab = "partners" | "links" | "attributions" | "boosters";

export function ReferralsAdminClient() {
    const [activeTab, setActiveTab] = useState<Tab>("partners");
    const [partners, setPartners] = useState<Partner[]>([]);
    const [links, setLinks] = useState<ReferralLink[]>([]);
    const [attributions, setAttributions] = useState<Attribution[]>([]);
    const [boosters, setBoosters] = useState<Booster[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        attributions?: Record<string, number>;
        boosters?: Record<string, { count: number; totalCents: number }>;
    }>({});

    // Modal states
    const [showCreatePartner, setShowCreatePartner] = useState(false);
    const [showCreateLink, setShowCreateLink] = useState(false);
    const [newPartner, setNewPartner] = useState({
        name: "",
        type: "ACCOUNTING",
        contactEmail: "",
        defaultBoosterRateBps: 1500,
    });
    const [newLink, setNewLink] = useState({ partnerId: "", code: "" });
    const [exportRange, setExportRange] = useState<string>("current");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [partnersRes, linksRes, attributionsRes, boostersRes] = await Promise.all([
                fetch("/api/admin/partners"),
                fetch("/api/admin/referral-links"),
                fetch("/api/admin/referrals/attributions"),
                fetch("/api/admin/referrals/boosters"),
            ]);

            if (partnersRes.ok) {
                const data = await partnersRes.json();
                setPartners(data.partners || []);
            }
            if (linksRes.ok) {
                const data = await linksRes.json();
                setLinks(data.links || []);
            }
            if (attributionsRes.ok) {
                const data = await attributionsRes.json();
                setAttributions(data.attributions || []);
                setStats((s) => ({ ...s, attributions: data.stats }));
            }
            if (boostersRes.ok) {
                const data = await boostersRes.json();
                setBoosters(data.boosters || []);
                setStats((s) => ({ ...s, boosters: data.stats }));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Erro", "Falha ao carregar dados");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreatePartner = async () => {
        try {
            const res = await fetch("/api/admin/partners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPartner),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create partner");
            }

            toast.success("Parceiro criado!");
            setShowCreatePartner(false);
            setNewPartner({ name: "", type: "ACCOUNTING", contactEmail: "", defaultBoosterRateBps: 1500 });
            fetchData();
        } catch (error) {
            toast.error("Erro", error instanceof Error ? error.message : "Falha ao criar");
        }
    };

    const handleCreateLink = async () => {
        try {
            const res = await fetch("/api/admin/referral-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newLink),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create link");
            }

            toast.success("Link criado!");
            setShowCreateLink(false);
            setNewLink({ partnerId: "", code: "" });
            fetchData();
        } catch (error) {
            toast.error("Erro", error instanceof Error ? error.message : "Falha ao criar");
        }
    };

    const handleTogglePartnerStatus = async (partner: Partner) => {
        try {
            const newStatus = partner.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
            const res = await fetch(`/api/admin/partners/${partner.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update");

            toast.success(`Parceiro ${newStatus === "ACTIVE" ? "ativado" : "pausado"}`);
            fetchData();
        } catch {
            toast.error("Erro", "Falha ao atualizar status");
        }
    };

    const handleUpdateBoosterStatus = async (boosterId: string, status: string) => {
        try {
            const res = await fetch(`/api/admin/referrals/boosters/${boosterId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) throw new Error("Failed to update");

            toast.success(`Booster marcado como ${status}`);
            fetchData();
        } catch {
            toast.error("Erro", "Falha ao atualizar booster");
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        toast.success("Copiado!");
    };

    const handleExportCSV = async () => {
        try {
            let url = "/api/admin/referrals/boosters/export";
            if (exportRange === "last3") {
                url += "?range=last3";
            } else if (exportRange === "current") {
                // current month, no param needed
            } else {
                // specific month
                url += `?range=${exportRange}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "boosters.csv";

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            toast.success("CSV exportado!");
        } catch {
            toast.error("Erro", "Falha ao exportar CSV");
        }
    };

    // Generate last 3 month options for dropdown
    const getMonthOptions = () => {
        const options: { value: string; label: string }[] = [
            { value: "current", label: "Mês atual" },
            { value: "last3", label: "Últimos 3 meses" },
        ];

        const now = new Date();
        for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
            if (i > 0) {
                options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
            }
        }

        return options;
    };

    const formatCurrency = (cents: number, currency = "EUR") => {
        return new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency: currency.toUpperCase(),
        }).format(cents / 100);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-PT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
        );
    }

    // Calculate summary stats
    const totalPending = boosters
        .filter((b) => b.status === "PENDING")
        .reduce((sum, b) => sum + b.amountCents, 0);
    const totalPaid = boosters
        .filter((b) => b.status === "PAID")
        .reduce((sum, b) => sum + b.amountCents, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Referrals & Partners</h2>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                        Gestão de parcerias e comissões
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-500/10 p-2">
                                <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{partners.filter((p) => p.status === "ACTIVE").length}</p>
                                <p className="text-xs text-[var(--color-muted-foreground)]">Parceiros Ativos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-green-500/10 p-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{attributions.filter((a) => a.status === "CONVERTED").length}</p>
                                <p className="text-xs text-[var(--color-muted-foreground)]">Convertidos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-yellow-500/10 p-2">
                                <Clock className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
                                <p className="text-xs text-[var(--color-muted-foreground)]">Pendente</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-green-500/10 p-2">
                                <DollarSign className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                                <p className="text-xs text-[var(--color-muted-foreground)]">Pago Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[var(--color-border)]">
                {(["partners", "links", "attributions", "boosters"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        }`}
                    >
                        {tab === "partners" && "Parceiros"}
                        {tab === "links" && "Links"}
                        {tab === "attributions" && "Atribuições"}
                        {tab === "boosters" && "Boosters"}
                    </button>
                ))}
            </div>

            {/* Partners Tab */}
            {activeTab === "partners" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Parceiros</CardTitle>
                        <Button onClick={() => setShowCreatePartner(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Parceiro
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Nome</th>
                                        <th className="pb-2 font-medium">Tipo</th>
                                        <th className="pb-2 font-medium">Taxa</th>
                                        <th className="pb-2 font-medium">Links</th>
                                        <th className="pb-2 font-medium">Atribuições</th>
                                        <th className="pb-2 font-medium">Pendente</th>
                                        <th className="pb-2 font-medium">Status</th>
                                        <th className="pb-2 font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partners.map((partner) => (
                                        <tr key={partner.id} className="border-b">
                                            <td className="py-3 font-medium">{partner.name}</td>
                                            <td className="py-3">{partner.type}</td>
                                            <td className="py-3">{(partner.defaultBoosterRateBps / 100).toFixed(1)}%</td>
                                            <td className="py-3">{partner.stats.linksCount}</td>
                                            <td className="py-3">{partner.stats.attributionsCount}</td>
                                            <td className="py-3">{formatCurrency(partner.stats.pendingBoosterCents)}</td>
                                            <td className="py-3">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                        partner.status === "ACTIVE"
                                                            ? "bg-green-500/10 text-green-600"
                                                            : "bg-gray-500/10 text-gray-600"
                                                    }`}
                                                >
                                                    {partner.status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleTogglePartnerStatus(partner)}
                                                >
                                                    {partner.status === "ACTIVE" ? "Pausar" : "Ativar"}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Links Tab */}
            {activeTab === "links" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Referral Links</CardTitle>
                        <Button onClick={() => setShowCreateLink(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Link
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Parceiro</th>
                                        <th className="pb-2 font-medium">Código</th>
                                        <th className="pb-2 font-medium">URL</th>
                                        <th className="pb-2 font-medium">Atribuições</th>
                                        <th className="pb-2 font-medium">Criado</th>
                                        <th className="pb-2 font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {links.map((link) => (
                                        <tr key={link.id} className="border-b">
                                            <td className="py-3">{link.partner.name}</td>
                                            <td className="py-3 font-mono text-xs">{link.code}</td>
                                            <td className="py-3 max-w-xs truncate text-xs text-[var(--color-muted-foreground)]">
                                                {link.fullUrl}
                                            </td>
                                            <td className="py-3">{link.attributionsCount}</td>
                                            <td className="py-3 text-xs">{formatDate(link.createdAt)}</td>
                                            <td className="py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(link.fullUrl)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Attributions Tab */}
            {activeTab === "attributions" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Atribuições</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Parceiro</th>
                                        <th className="pb-2 font-medium">Código</th>
                                        <th className="pb-2 font-medium">Organização</th>
                                        <th className="pb-2 font-medium">Plano</th>
                                        <th className="pb-2 font-medium">Status</th>
                                        <th className="pb-2 font-medium">Signup</th>
                                        <th className="pb-2 font-medium">Convertido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attributions.map((attr) => (
                                        <tr key={attr.id} className="border-b">
                                            <td className="py-3">{attr.partner.name}</td>
                                            <td className="py-3 font-mono text-xs">{attr.referralLink?.code || "-"}</td>
                                            <td className="py-3">{attr.organization?.name || "-"}</td>
                                            <td className="py-3">{attr.organization?.subscription?.planId || "trial"}</td>
                                            <td className="py-3">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                        attr.status === "CONVERTED"
                                                            ? "bg-green-500/10 text-green-600"
                                                            : attr.status === "SIGNED_UP"
                                                                ? "bg-blue-500/10 text-blue-600"
                                                                : "bg-gray-500/10 text-gray-600"
                                                    }`}
                                                >
                                                    {attr.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-xs">{attr.signupAt ? formatDate(attr.signupAt) : "-"}</td>
                                            <td className="py-3 text-xs">{attr.convertedAt ? formatDate(attr.convertedAt) : "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Boosters Tab */}
            {activeTab === "boosters" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Booster Ledger</CardTitle>
                        <div className="flex items-center gap-2">
                            <select
                                value={exportRange}
                                onChange={(e) => setExportRange(e.target.value)}
                                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                            >
                                {getMonthOptions().map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Exportar CSV
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Parceiro</th>
                                        <th className="pb-2 font-medium">Organização</th>
                                        <th className="pb-2 font-medium">Valor</th>
                                        <th className="pb-2 font-medium">Taxa</th>
                                        <th className="pb-2 font-medium">Invoice</th>
                                        <th className="pb-2 font-medium">Status</th>
                                        <th className="pb-2 font-medium">Data</th>
                                        <th className="pb-2 font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {boosters.map((booster) => (
                                        <tr key={booster.id} className="border-b">
                                            <td className="py-3">{booster.partner.name}</td>
                                            <td className="py-3">{booster.organization?.name || "-"}</td>
                                            <td className="py-3 font-medium">{formatCurrency(booster.amountCents, booster.currency)}</td>
                                            <td className="py-3">{(booster.rateBps / 100).toFixed(1)}%</td>
                                            <td className="py-3 font-mono text-xs">
                                                {booster.stripeInvoiceId?.slice(0, 12) || "-"}
                                            </td>
                                            <td className="py-3">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                        booster.status === "PAID"
                                                            ? "bg-green-500/10 text-green-600"
                                                            : booster.status === "PENDING"
                                                                ? "bg-yellow-500/10 text-yellow-600"
                                                                : booster.status === "VOID"
                                                                    ? "bg-red-500/10 text-red-600"
                                                                    : "bg-blue-500/10 text-blue-600"
                                                    }`}
                                                >
                                                    {booster.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-xs">{formatDate(booster.createdAt)}</td>
                                            <td className="py-3">
                                                {booster.status === "PENDING" && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleUpdateBoosterStatus(booster.id, "PAID")}
                                                            title="Marcar como pago"
                                                        >
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleUpdateBoosterStatus(booster.id, "VOID")}
                                                            title="Anular"
                                                        >
                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Partner Modal */}
            {showCreatePartner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-[var(--color-background)] p-6 shadow-lg">
                        <h3 className="mb-4 text-lg font-semibold">Novo Parceiro</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Nome *</label>
                                <input
                                    type="text"
                                    value={newPartner.name}
                                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                                    className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                                    placeholder="Nome da contabilidade"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Tipo</label>
                                <select
                                    value={newPartner.type}
                                    onChange={(e) => setNewPartner({ ...newPartner, type: e.target.value })}
                                    className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                                >
                                    <option value="ACCOUNTING">Contabilidade</option>
                                    <option value="AGENCY">Agência</option>
                                    <option value="OTHER">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email de contacto</label>
                                <input
                                    type="email"
                                    value={newPartner.contactEmail}
                                    onChange={(e) => setNewPartner({ ...newPartner, contactEmail: e.target.value })}
                                    className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                                    placeholder="email@contabilidade.pt"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Taxa de booster (%)</label>
                                <input
                                    type="number"
                                    value={newPartner.defaultBoosterRateBps / 100}
                                    onChange={(e) =>
                                        setNewPartner({
                                            ...newPartner,
                                            defaultBoosterRateBps: Math.round(parseFloat(e.target.value) * 100),
                                        })
                                    }
                                    className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                                    step="0.5"
                                    min="0"
                                    max="50"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <Button variant="ghost" onClick={() => setShowCreatePartner(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button onClick={handleCreatePartner} disabled={!newPartner.name} className="flex-1">
                                Criar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Link Modal */}
            {showCreateLink && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-[var(--color-background)] p-6 shadow-lg">
                        <h3 className="mb-4 text-lg font-semibold">Novo Referral Link</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Parceiro *</label>
                                <select
                                    value={newLink.partnerId}
                                    onChange={(e) => setNewLink({ ...newLink, partnerId: e.target.value })}
                                    className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                                >
                                    <option value="">Selecionar parceiro</option>
                                    {partners
                                        .filter((p) => p.status === "ACTIVE")
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Código (opcional)</label>
                                <input
                                    type="text"
                                    value={newLink.code}
                                    onChange={(e) => setNewLink({ ...newLink, code: e.target.value.toLowerCase() })}
                                    className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                                    placeholder="auto-gerado se vazio"
                                />
                                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                                    Deixar vazio para gerar automaticamente
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <Button variant="ghost" onClick={() => setShowCreateLink(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button onClick={handleCreateLink} disabled={!newLink.partnerId} className="flex-1">
                                Criar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
