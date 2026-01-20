"use client";

import { useSearchParams } from "next/navigation";
import { QuoteTimeline, type TimelineEvent } from "./quote-timeline";

interface TimelineWrapperProps {
    events: TimelineEvent[];
    currentRunId: number;
    quoteCreatedAt: string;
    quoteSentAt: string | null;
}

/**
 * P0 Fix: Wrapper for QuoteTimeline that handles seed=1 query param
 * to highlight the first D+1 event after Aha
 */
export function TimelineWrapper({ events, currentRunId, quoteCreatedAt, quoteSentAt }: TimelineWrapperProps) {
    const searchParams = useSearchParams();

    // P0 Fix: Detect if this is immediately after Aha (just marked as sent from seed)
    // We highlight the first event when the quote was just sent (has sentAt) and seed param is present
    const isSeedAha = searchParams.get("seed") === "1" && quoteSentAt !== null;

    return (
        <QuoteTimeline
            events={events}
            currentRunId={currentRunId}
            quoteCreatedAt={quoteCreatedAt}
            quoteSentAt={quoteSentAt}
            highlightFirstEvent={isSeedAha}
        />
    );
}
