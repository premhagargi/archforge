import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Editor",
  description:
    "Model your architecture on an infinite canvas, simulate load, and review for bottlenecks.",
};

/**
 * Phase 1 stub. Phase 5 replaces this with a `'use client'` wrapper that
 * lazy-loads the React Flow canvas via `dynamic(..., { ssr: false })`.
 */
export default function EditorPage() {
  return (
    <main className="bg-dot-grid flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Editor</h1>
        <p className="mt-3 text-text-secondary">
          The architecture canvas, component palette, inspector, and analysis
          panel are wired up in a later phase. The foundation — design system,
          domain model, and component catalog — is in place.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back home
          </Link>
        </Button>
      </div>
    </main>
  );
}
