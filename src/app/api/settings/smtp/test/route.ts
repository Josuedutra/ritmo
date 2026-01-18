import { NextRequest, NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import nodemailer from "nodemailer";

/**
 * POST /api/settings/smtp/test
 *
 * Test SMTP connection with provided credentials.
 * Does not save settings, just verifies connection.
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "settings/smtp/test" });

    try {
        const session = await getApiSession();
        if (!session) {
            return unauthorized();
        }

        // Check admin role
        if (session.user.role !== "admin") {
            return NextResponse.json(
                { error: "Apenas administradores podem testar configurações" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { host, port, user, pass, from } = body;

        // Validate required fields
        if (!host || !port || !user || !pass) {
            return NextResponse.json(
                { error: "Campos obrigatórios em falta" },
                { status: 400 }
            );
        }

        log.info({ host, port, user: user?.substring(0, 3) + "***" }, "Testing SMTP connection");

        // Create transporter with provided settings
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port),
            secure: parseInt(port) === 465, // true for 465, false for other ports
            auth: {
                user,
                pass,
            },
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 5000,
        });

        // Verify connection
        await transporter.verify();

        log.info({ host, port }, "SMTP connection test successful");

        return NextResponse.json({
            success: true,
            message: "Conexão SMTP verificada com sucesso",
        });
    } catch (error) {
        log.error({ error }, "SMTP connection test failed");

        // Parse common SMTP errors
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        let friendlyMessage = "Não foi possível conectar ao servidor SMTP";

        if (errorMessage.includes("ECONNREFUSED")) {
            friendlyMessage = "Conexão recusada. Verifique o host e porta.";
        } else if (errorMessage.includes("ENOTFOUND")) {
            friendlyMessage = "Servidor não encontrado. Verifique o host.";
        } else if (errorMessage.includes("auth") || errorMessage.includes("535")) {
            friendlyMessage = "Autenticação falhou. Verifique utilizador e password.";
        } else if (errorMessage.includes("timeout")) {
            friendlyMessage = "Timeout na conexão. Verifique o firewall.";
        }

        return NextResponse.json(
            {
                success: false,
                error: friendlyMessage,
                details: errorMessage,
            },
            { status: 400 }
        );
    }
}
