/**
 * Centralized Configuration Constants
 *
 * P0.1: Avoid scattered fallbacks and ensure consistency across the app.
 */

/**
 * Application origin URL (used for OAuth callbacks, Stripe redirects, etc.)
 * CRITICAL: Must match NEXTAUTH_URL in production.
 */
export const APP_ORIGIN = process.env.NEXTAUTH_URL || "https://app.useritmo.pt";

/**
 * Public-facing app URL (for emails, unsubscribe links, etc.)
 * Falls back to APP_ORIGIN if not explicitly set.
 */
export const PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || APP_ORIGIN;

/**
 * Support/contact email addresses
 */
export const SUPPORT_EMAIL = "ritmo@useritmo.pt";
export const PARTNERSHIPS_EMAIL = "parcerias@useritmo.pt";
export const LEGAL_EMAIL = "geral@useritmo.pt";

/**
 * Inbound email domain (for BCC capture)
 * Keeping on ritmo.app as per DNS migration plan (option 1)
 */
export const INBOUND_DOMAIN = process.env.INBOUND_DOMAIN || "inbound.ritmo.app";

/**
 * Default email sender
 */
export const DEFAULT_EMAIL_FROM = process.env.RESEND_FROM || process.env.EMAIL_FROM || "Ritmo <noreply@useritmo.pt>";

