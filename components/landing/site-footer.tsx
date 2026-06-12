import Link from "next/link";

import { BrandMark } from "@/components/brand/logo";
import { GithubMark, GITHUB_URL } from "@/components/brand/github-mark";

const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { href: "/editor", label: "Editor" },
      { href: "/templates", label: "Templates" },
      { href: "/examples/url-shortener", label: "Examples" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: GITHUB_URL, label: "GitHub", external: true },
    ],
  },
] as const;

/** Shared marketing footer. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary-bg/50">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2" aria-label="ArchForge home">
            <BrandMark className="size-7" />
            <span className="text-base font-semibold tracking-tight">
              ArchForge
            </span>
          </Link>
          <p className="max-w-xs text-sm leading-6 text-text-secondary">
            An open-source visual system-design platform. Deterministic engines,
            real discrete-event simulation, no AI hand-waving.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text"
          >
            <GithubMark className="size-4" />
            Star on GitHub
          </a>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {section.title}
            </span>
            <ul className="flex flex-col gap-2 text-sm">
              {section.links.map((link) => (
                <li key={link.href}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-secondary transition-colors hover:text-text"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-text-secondary transition-colors hover:text-text"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-sm text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} ArchForge · MIT licensed</span>
          <span>Built with Next.js, React Flow, Yjs &amp; a discrete-event engine.</span>
        </div>
      </div>
    </footer>
  );
}
