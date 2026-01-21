"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, toast } from "@/components/ui";
import { UpgradePrompt, UPGRADE_PROMPTS } from "@/components/billing/upgrade-prompt";
import { Users, UserPlus, Trash2, Loader2 } from "lucide-react";

/**
 * Users Section Component (P1-UPGRADE-PROMPTS)
 *
 * Manages organization users with seat limit upgrade prompt.
 */

interface User {
    id: string;
    email: string;
    name: string | null;
    role: "admin" | "member";
    createdAt: string;
}

interface SeatsInfo {
    current: number;
    max: number;
    remaining: number;
}

interface UsersResponse {
    users: User[];
    seats: SeatsInfo;
}

interface UsersSectionProps {
    initialData?: UsersResponse | null;
}

export function UsersSection({ initialData }: UsersSectionProps) {
    const [users, setUsers] = useState<User[]>(initialData?.users || []);
    const [seats, setSeats] = useState<SeatsInfo | null>(initialData?.seats || null);
    const [loading, setLoading] = useState(!initialData);
    const [showAddUser, setShowAddUser] = useState(false);
    const [seatLimitError, setSeatLimitError] = useState(false);
    const [addingUser, setAddingUser] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    // Form state
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<"admin" | "member">("member");

    useEffect(() => {
        if (!initialData) {
            fetchUsers();
        }
    }, [initialData]);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data: UsersResponse = await res.json();
                setUsers(data.users);
                setSeats(data.seats);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!newEmail || !newPassword) {
            toast.error("Preencha email e password");
            return;
        }

        setAddingUser(true);
        setSeatLimitError(false);

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: newEmail,
                    name: newName || undefined,
                    password: newPassword,
                    role: newRole,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === "SEAT_LIMIT_EXCEEDED") {
                    setSeatLimitError(true);
                    return;
                }
                toast.error(data.message || "Erro ao adicionar utilizador");
                return;
            }

            toast.success("Utilizador adicionado!");
            setUsers([...users, data.user]);
            setSeats((prev) =>
                prev ? { ...prev, current: prev.current + 1, remaining: prev.remaining - 1 } : prev
            );
            resetForm();
        } catch (error) {
            console.error("Failed to add user:", error);
            toast.error("Erro ao adicionar utilizador");
        } finally {
            setAddingUser(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Tem a certeza que deseja remover este utilizador?")) return;

        setDeletingUserId(userId);
        try {
            const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
            if (res.ok) {
                setUsers(users.filter((u) => u.id !== userId));
                setSeats((prev) =>
                    prev ? { ...prev, current: prev.current - 1, remaining: prev.remaining + 1 } : prev
                );
                toast.success("Utilizador removido");
            } else {
                const data = await res.json();
                toast.error(data.message || "Erro ao remover");
            }
        } catch (error) {
            console.error("Failed to delete user:", error);
            toast.error("Erro ao remover utilizador");
        } finally {
            setDeletingUserId(null);
        }
    };

    const resetForm = () => {
        setNewEmail("");
        setNewName("");
        setNewPassword("");
        setNewRole("member");
        setShowAddUser(false);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4" />
                        Utilizadores
                    </CardTitle>
                    {seats && (
                        <Badge variant="secondary">
                            {seats.current}/{seats.max} lugares
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* P1-UPGRADE-PROMPTS: Seat limit error */}
                {seatLimitError && (
                    <UpgradePrompt
                        reason="seat_limit"
                        location="users_section"
                        variant="inline"
                        {...UPGRADE_PROMPTS.seat_limit}
                        onDismiss={() => setSeatLimitError(false)}
                    />
                )}

                {/* User list */}
                <div className="space-y-2">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between rounded-md bg-[var(--color-muted)]/30 px-3 py-2"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {user.name || user.email}
                                </p>
                                {user.name && (
                                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                                        {user.email}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                    {user.role === "admin" ? "Admin" : "Membro"}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={deletingUserId === user.id}
                                    className="h-7 w-7 p-0 text-[var(--color-muted-foreground)] hover:text-red-500"
                                >
                                    {deletingUserId === user.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add user form */}
                {showAddUser ? (
                    <div className="space-y-3 rounded-md border border-[var(--color-border)] p-3">
                        <Input
                            type="email"
                            placeholder="Email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                        <Input
                            type="text"
                            placeholder="Nome (opcional)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as "admin" | "member")}
                            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                        >
                            <option value="member">Membro</option>
                            <option value="admin">Admin</option>
                        </select>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={resetForm}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleAddUser}
                                disabled={addingUser}
                                className="flex-1 gap-1.5"
                            >
                                {addingUser ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <UserPlus className="h-4 w-4" />
                                )}
                                Adicionar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        onClick={() => setShowAddUser(true)}
                        className="w-full gap-1.5"
                        disabled={seats?.remaining === 0}
                    >
                        <UserPlus className="h-4 w-4" />
                        Adicionar utilizador
                    </Button>
                )}

                {/* Seats remaining info */}
                {seats && seats.remaining === 0 && !seatLimitError && (
                    <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                        Todos os lugares ocupados.{" "}
                        <a href="/settings/billing" className="text-[var(--color-primary)] hover:underline">
                            Atualizar plano
                        </a>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
