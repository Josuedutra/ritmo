import { NextResponse } from "next/server";

export async function POST() {
    // Analytics stub — accepts ROI calculator events silently
    return NextResponse.json({ ok: true });
}
