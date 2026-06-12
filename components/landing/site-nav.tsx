"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { GithubMark, GITHUB_URL } from "@/components/brand/github-mark";

const NAV_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/examples/url-shortener", label: "Examples" },
  { href: "/about", label: "About" },
] as const;

/** Sticky top navigation shared across all marketing pages. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="rounded-md" aria-label="ArchForge home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-secondary-bg text-text"
                    : "text-text-secondary hover:bg-secondary-bg hover:text-text",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ArchForge on GitHub"
            className="grid size-9 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-secondary-bg hover:text-text"
          >
            <GithubMark className="size-[18px]" />
          </a>
          <Button asChild size="sm">
            <Link href="/editor">Open editor</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
