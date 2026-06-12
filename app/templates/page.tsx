import type { Metadata } from "next";

import { TEMPLATES } from "@/lib/templates";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { SectionHeading } from "@/components/landing/section-heading";
import { TemplateCard } from "@/components/landing/template-card";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Eight real-world reference architectures — URL shortener, Instagram feed, WhatsApp chat, food delivery, file storage, search engine, video streaming, and a notification system. Open any one in the editor.",
};

export default function TemplatesPage() {
  return (
    <div className="marketing-page flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-secondary-bg/40">
          <div
            aria-hidden
            className="bg-aurora pointer-events-none absolute inset-0 opacity-80"
          />
          <div
            aria-hidden
            className="bg-blueprint pointer-events-none absolute inset-0 opacity-40"
          />
          <div className="relative mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="Templates"
                title="Reference architectures, ready to simulate."
                description="Each template is a complete, loadable diagram with traffic assumptions, scaling notes, and known bottlenecks. Open one to model, simulate, and review it as your own."
              />
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((template, i) => (
              <Reveal key={template.id} className="h-full" delay={(i % 3) * 70}>
                <TemplateCard template={template} className="h-full" />
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
