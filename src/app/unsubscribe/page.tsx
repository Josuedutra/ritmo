import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { MailX, CheckCircle } from "lucide-react";
import { verifyUnsubscribeToken } from "@/lib/tokens";

interface PageProps {
  searchParams: Promise<{ t?: string; success?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { t: token, success } = await searchParams;

  // Success state
  if (success === "true") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-success mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle className="text-success h-8 w-8" />
            </div>
            <CardTitle>Email removido com sucesso</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-[var(--color-muted-foreground)]">
              O seu endereço de email foi removido da lista de follow-up automático. Não receberá
              mais emails desta sequência.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validate token
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Link inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-[var(--color-muted-foreground)]">
              O link de cancelamento é inválido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verify and decode signed token
  const tokenData = verifyUnsubscribeToken(token);

  if (!tokenData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Link inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-[var(--color-muted-foreground)]">
              O link de cancelamento é inválido ou expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { organizationId, email } = tokenData;

  // Get organization name for display
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Organização não encontrada</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-[var(--color-muted-foreground)]">
              A organização associada a este link não foi encontrada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already unsubscribed
  const existingSuppression = await prisma.suppressionGlobal.findUnique({
    where: {
      organizationId_email: { organizationId, email: email.toLowerCase() },
    },
  });

  if (existingSuppression) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-info mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle className="text-info h-8 w-8" />
            </div>
            <CardTitle>Já está removido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-[var(--color-muted-foreground)]">
              O email <strong>{email}</strong> já foi removido da lista de emails de{" "}
              <strong>{org.name}</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-warning mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <MailX className="text-warning h-8 w-8" />
          </div>
          <CardTitle>Cancelar subscrição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-[var(--color-muted-foreground)]">
            Deseja deixar de receber emails de follow-up automáticos de <strong>{org.name}</strong>?
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Email: <strong>{email}</strong>
          </p>

          <form action="/api/unsubscribe" method="POST" className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="destructive" className="w-full">
              Confirmar cancelamento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
