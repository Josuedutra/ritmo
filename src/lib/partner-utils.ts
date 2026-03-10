import { prisma } from "@/lib/prisma";

export async function checkIsPartner(email: string): Promise<boolean> {
  const partner = await prisma.partner.findFirst({
    where: { contactEmail: email.toLowerCase() },
    select: { id: true },
  });
  return Boolean(partner);
}
