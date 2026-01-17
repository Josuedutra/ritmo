import { addDays, isWeekend, isSameDay, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const DEFAULT_TIMEZONE = "Europe/Lisbon";

// Portuguese public holidays (fixed dates)
// Note: Easter-based holidays need special calculation
const FIXED_HOLIDAYS = [
    { month: 1, day: 1 },   // Ano Novo
    { month: 4, day: 25 },  // Dia da Liberdade
    { month: 5, day: 1 },   // Dia do Trabalhador
    { month: 6, day: 10 },  // Dia de Portugal
    { month: 8, day: 15 },  // Assunção de Nossa Senhora
    { month: 10, day: 5 },  // Implantação da República
    { month: 11, day: 1 },  // Todos os Santos
    { month: 12, day: 1 },  // Restauração da Independência
    { month: 12, day: 8 },  // Imaculada Conceição
    { month: 12, day: 25 }, // Natal
];

/**
 * Calculate Easter Sunday for a given year (Anonymous Gregorian algorithm)
 */
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

/**
 * Get all Portuguese holidays for a given year
 * Note: For MVP, we use fixed holidays only. Easter-based holidays can be added later.
 */
function getHolidaysForYear(year: number): Date[] {
    const holidays: Date[] = [];

    // Fixed holidays
    for (const h of FIXED_HOLIDAYS) {
        holidays.push(new Date(year, h.month - 1, h.day));
    }

    // Easter-based holidays (P2 - can be disabled via flag)
    if (process.env.INCLUDE_EASTER_HOLIDAYS !== "false") {
        const easter = getEasterSunday(year);

        // Sexta-feira Santa (Easter - 2 days)
        holidays.push(addDays(easter, -2));

        // Corpo de Deus (Easter + 60 days)
        holidays.push(addDays(easter, 60));
    }

    return holidays;
}

/**
 * Check if a date is a Portuguese holiday
 */
function isPortugueseHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const holidays = getHolidaysForYear(year);
    return holidays.some((h) => isSameDay(h, date));
}

/**
 * Check if a date is a business day (not weekend, not holiday)
 */
export function isBusinessDay(date: Date): boolean {
    if (isWeekend(date)) return false;
    if (isPortugueseHoliday(date)) return false;
    return true;
}

/**
 * Add business days to a date
 * 
 * @param date - Start date
 * @param days - Number of business days to add
 * @param timezone - Timezone (default: Europe/Lisbon)
 * @returns New date after adding business days
 */
export function addBusinessDays(
    date: Date,
    days: number,
    timezone: string = DEFAULT_TIMEZONE
): Date {
    // Convert to zoned time for accurate day calculations
    let current = toZonedTime(date, timezone);
    let added = 0;

    while (added < days) {
        current = addDays(current, 1);
        if (isBusinessDay(current)) {
            added++;
        }
    }

    return current;
}

/**
 * Check if current time is within the send window
 * 
 * @param windowStart - Start time in "HH:mm" format
 * @param windowEnd - End time in "HH:mm" format
 * @param timezone - Timezone (default: Europe/Lisbon)
 */
export function isWithinSendWindow(
    windowStart: string = "09:00",
    windowEnd: string = "18:00",
    timezone: string = DEFAULT_TIMEZONE
): boolean {
    const now = toZonedTime(new Date(), timezone);
    const currentTime = format(now, "HH:mm");

    return currentTime >= windowStart && currentTime < windowEnd;
}

/**
 * Get the next available send time (within window, on a business day)
 * 
 * @param windowStart - Start time in "HH:mm" format
 * @param timezone - Timezone (default: Europe/Lisbon)
 */
export function getNextSendTime(
    windowStart: string = "09:00",
    timezone: string = DEFAULT_TIMEZONE
): Date {
    const now = toZonedTime(new Date(), timezone);
    const currentTime = format(now, "HH:mm");

    // Parse window start
    const [hours, minutes] = windowStart.split(":").map(Number);

    // If we're past the window start today and it's a business day, return now
    if (currentTime >= windowStart && isBusinessDay(now)) {
        return fromZonedTime(now, timezone);
    }

    // Otherwise, find the next business day at window start
    let target = now;

    // If we're past window or not a business day, start from tomorrow
    if (currentTime >= windowStart || !isBusinessDay(now)) {
        target = addDays(now, 1);
        while (!isBusinessDay(target)) {
            target = addDays(target, 1);
        }
    }

    // Set time to window start
    target.setHours(hours, minutes, 0, 0);

    return fromZonedTime(target, timezone);
}

/**
 * Check if enough time has passed since the last email (48h rule)
 * 
 * @param lastEmailSentAt - When the last email was sent
 * @param cooldownHours - Minimum hours between emails (default: 48)
 */
export function hasEnoughCooldown(
    lastEmailSentAt: Date | null,
    cooldownHours: number = 48
): boolean {
    if (!lastEmailSentAt) return true;

    const now = new Date();
    const hoursSinceLastEmail = (now.getTime() - lastEmailSentAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastEmail >= cooldownHours;
}

/**
 * Calculate when the cooldown period will end
 */
export function getCooldownEndTime(
    lastEmailSentAt: Date,
    cooldownHours: number = 48
): Date {
    return new Date(lastEmailSentAt.getTime() + cooldownHours * 60 * 60 * 1000);
}
