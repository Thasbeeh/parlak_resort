"use client";

import * as React from "react";
import { MessageCircle, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildWhatsAppUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const HOME_FAQS: FaqItem[] = [
  {
    id: "faq-timings",
    question: "What are standard check-in and gathering timings?",
    answer:
      "Overnight stays check in at 12:00\u00A0PM IST and check out at 11:00\u00A0AM IST the next day. Day slots run from 10:00\u00A0AM to 3:00\u00A0PM IST on the same day. Event Halls operate strictly on scheduled gathering windows: Morning Slot (10:00\u00A0AM – 3:00\u00A0PM) and Evening Slot (5:00\u00A0PM – 10:00\u00A0PM).",
  },
  {
    id: "faq-advance-payment",
    question:
      "How does the booking advance payment, stay extension, and scope reduction work?",
    answer:
      "A dynamic booking advance defined per rate plan or event slab is collected during booking confirmation and credited directly toward your total room or venue rent. Confirmed reservations preserve agreed baseline rates. Subsequent stay extensions (extra nights or additional day slots) and event headcount upgrades to higher slabs are calculated based on the active rate card in effect at modification time, ensuring you pay only the incremental capacity difference. Standard packages (Overnight 12:00\u00A0PM – 11:00\u00A0AM, Day Slots, and Event Slots) are billed as flat packages without fractional hourly discounts. Any scope reductions (fewer nights, dropped slots, or lower headcount slabs) act strictly as partial cancellations subject to management review rather than automatic refunds.",
  },
  {
    id: "faq-pool-access",
    question: "Can Event Hall attendees use the swimming pool?",
    answer:
      "Strictly NO under any circumstances. Swimming pool access is reserved exclusively for overnight Dome and A-Frame residents for safety and privacy.",
  },
  {
    id: "faq-dining",
    question: "Are outside food and dining services available?",
    answer:
      "Our on-site restaurant menu is available until 10:30\u00A0PM IST. Outside catering is permitted exclusively for private event hall bookings.",
  },
  {
    id: "faq-occupancy",
    question: "What is the maximum guest limit per unit?",
    answer:
      "Guest count is strictly capped at 3 adults and 2 infants for Domes, and 5 adults and 4 infants for A-Frames. We strictly do not provide extra beds.",
  },
];

export const HOME_FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export interface FaqAccordionProps {
  className?: string;
}

/**
 * FaqAccordion - Minimalist Architectural Rule List
 *
 * Enforces:
 * 1. Single Canvas Architecture: Clean structural hairline dividers (divide-y) without outer card wrappers.
 * 2. Editorial Typography: Fraunces display font for question headers with line lengths clamped < 75 chars.
 * 3. FAQPage Structured Data: Fully preserved for Google rich results.
 */
export function FaqAccordion({ className }: FaqAccordionProps) {
  const customInquiryUrl = buildWhatsAppUrl(
    "Hi Parlak Resort, I have a question regarding bookings and policies that is not listed in the FAQ.",
  );

  return (
    <section
      aria-label="Frequently Asked Questions"
      className={cn(
        "content-visibility-auto mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8",
        className,
      )}
    >
      {/* FAQ Structured Data for Google Rich Snippets */}
      <JsonLd data={HOME_FAQ_JSONLD} id="faq-page-jsonld" />

      {/* Header */}
      <div className="mb-12 text-center">
        <span className="text-primary font-malayalam text-xs font-semibold tracking-wider select-none">
          ഓരോ യാത്രയും ഉത്തരങ്ങളായിരുന്നു...
        </span>
        <h2 className="text-foreground mt-2 font-serif text-3xl tracking-tight sm:text-4xl lg:text-5xl">
          Frequently Asked Questions
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
          Clear answers on standard operating hours, occupancy caps, advance
          tariffs, and resident pool privacy.
        </p>
      </div>

      {/* Minimalist Architectural Rule List */}
      <div className="border-border/60 border-y">
        <Accordion className="divide-border/60 divide-y">
          {HOME_FAQS.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="py-2">
              <AccordionTrigger className="text-foreground hover:text-primary cursor-pointer py-4 text-left text-base font-medium transition-colors select-none sm:text-lg">
                <span className="pr-4">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground max-w-3xl pt-1 pb-4 text-xs leading-relaxed sm:text-sm">
                <p>{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Direct WhatsApp Prompt Footer */}
      <div className="bg-surface-subtle/70 border-border/60 mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border p-6 sm:flex-row">
        <div className="flex items-center gap-3.5 text-left">
          <div className="bg-primary/10 text-primary border-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <HelpCircle className="size-5 shrink-0" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-semibold">
              Have a specific question?
            </h3>
            <p className="text-muted-foreground text-xs">
              Our resort management team is available directly on WhatsApp.
            </p>
          </div>
        </div>
        <a
          href={customInquiryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground hover:bg-primary/95 inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]"
        >
          <MessageCircle className="size-4 shrink-0" />
          <span>Chat on WhatsApp</span>
        </a>
      </div>
    </section>
  );
}

export default FaqAccordion;
