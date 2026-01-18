"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQAccordionProps {
    items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="mx-auto max-w-3xl divide-y divide-[var(--color-border)]">
            {items.map((item, index) => (
                <div key={index} className="py-4">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 text-left"
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        aria-expanded={openIndex === index}
                    >
                        <span className="font-medium">{item.question}</span>
                        <ChevronDown
                            className={cn(
                                "h-5 w-5 shrink-0 text-[var(--color-muted-foreground)] transition-transform",
                                openIndex === index && "rotate-180"
                            )}
                        />
                    </button>
                    <div
                        className={cn(
                            "grid transition-all duration-200",
                            openIndex === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                    >
                        <div className="overflow-hidden">
                            <p className="pt-4 text-[var(--color-muted-foreground)]">
                                {item.answer}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
