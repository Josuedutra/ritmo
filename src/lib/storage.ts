import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Service client for server-side operations (with service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const BUCKET_NAME = "proposals";

interface UploadResult {
    success: boolean;
    path?: string;
    error?: string;
}

interface SignedUrlResult {
    success: boolean;
    url?: string;
    error?: string;
}

/**
 * Upload file to Supabase Storage
 * 
 * Files are stored with org scoping: {organizationId}/{quoteId}/{filename}
 */
export async function uploadFile(
    organizationId: string,
    quoteId: string,
    filename: string,
    file: Buffer,
    contentType: string
): Promise<UploadResult> {
    const log = logger.child({ service: "storage" });

    if (!supabaseUrl || !supabaseServiceKey) {
        log.warn("Supabase not configured - storage disabled");
        return { success: false, error: "Storage not configured" };
    }

    const path = `${organizationId}/${quoteId}/${filename}`;

    try {
        const { error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(path, file, {
                contentType,
                upsert: true,
            });

        if (error) {
            log.error({ error: error.message, path }, "Upload failed");
            return { success: false, error: error.message };
        }

        log.info({ path }, "File uploaded successfully");
        return { success: true, path };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log.error({ error: message }, "Upload exception");
        return { success: false, error: message };
    }
}

/**
 * Get signed URL for file download
 * 
 * URL expires after expiresIn seconds (default 1 hour)
 */
export async function getSignedUrl(
    path: string,
    expiresIn: number = 3600
): Promise<SignedUrlResult> {
    const log = logger.child({ service: "storage" });

    if (!supabaseUrl || !supabaseServiceKey) {
        log.warn("Supabase not configured - storage disabled");
        return { success: false, error: "Storage not configured" };
    }

    try {
        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUrl(path, expiresIn);

        if (error) {
            log.error({ error: error.message, path }, "Failed to create signed URL");
            return { success: false, error: error.message };
        }

        return { success: true, url: data.signedUrl };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log.error({ error: message }, "Signed URL exception");
        return { success: false, error: message };
    }
}

/**
 * Delete file from storage
 */
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    const log = logger.child({ service: "storage" });

    if (!supabaseUrl || !supabaseServiceKey) {
        return { success: false, error: "Storage not configured" };
    }

    try {
        const { error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([path]);

        if (error) {
            log.error({ error: error.message, path }, "Delete failed");
            return { success: false, error: error.message };
        }

        log.info({ path }, "File deleted");
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: message };
    }
}
