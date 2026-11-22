import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MobileMenu } from '@/components/MobileMenu';
import { AppConfig } from '@/utils/AppConfig';

const fallbackHref = '/about/';

const footerLinks = [
  {
    heading: 'Platform',
    links: [
      { label: 'Background agents', href: '/learn/agents' },
      { label: 'Automations', href: '/learn/automations' },
      { label: 'Environments', href: '/learn/environments' },
      { label: 'Integrations', href: fallbackHref },
      { label: 'Governance', href: '/learn/governance' },
      { label: 'Pricing', href: '/demo/' },
    ],
  },
  {
    heading: 'Use cases',
    links: [
      { label: 'AI code review', href: '/learn/code-review' },
      { label: 'Backlog tickets', href: '/learn/backlog-automation' },
      { label: 'Bug triage', href: '/portfolio/incident-triage' },
      { label: 'Code migration', href: '/learn/code-migration' },
      { label: 'CVE remediation', href: '/learn/cve-remediation' },
      { label: 'Docs drift', href: '/learn/maintenance-agents' },
    ],
  },
  {
    heading: 'Compare',
    links: [
      { label: 'Claude Code', href: fallbackHref },
      { label: 'Cursor', href: fallbackHref },
      { label: 'GitHub Copilot', href: fallbackHref },
      { label: 'Devin', href: fallbackHref },
      { label: 'Codex', href: fallbackHref },
      { label: 'Factory', href: fallbackHref },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/learn/' },
      { label: 'Docs', href: '/learn/' },
      { label: 'Changelog', href: fallbackHref },
      { label: 'Events', href: fallbackHref },
      { label: 'Newsletter', href: fallbackHref },
      { label: 'Templates', href: fallbackHref },
      { label: 'Reports', href: fallbackHref },
      { label: 'Skills', href: fallbackHref },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'Careers', href: fallbackHref },
      { label: 'Media', href: fallbackHref },
      { label: 'Contact', href: '/demo/' },
    ],
  },
];

export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] antialiased">
      <header
        className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-header)] backdrop-blur-xl"
      >
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex-shrink-0">
            <span className="text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {AppConfig.name}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden md:flex">
            <ul className="flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)]">
              {props.leftNav}
            </ul>
          </nav>

          {/* Desktop right actions */}
          <div className="hidden items-center gap-2 text-sm md:flex">
            <ThemeToggle />
            {props.rightNav}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <MobileMenu />
          </div>
        </div>
      </header>

      <main className="pt-12">{props.children}</main>

      <footer className="border-t border-[var(--border)] bg-[var(--bg)] px-6 pt-12 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
            {footerLinks.map(col => (
              <div key={col.heading}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] py-6 text-xs text-[var(--text-muted)]">
            <span suppressHydrationWarning>{`© ${new Date().getFullYear()} ${AppConfig.name}`}</span>
            <div className="flex flex-wrap gap-3">
              {['Status', 'Security', 'Imprint', 'Terms of service', 'Privacy policy', 'Cookie policy'].map(
                item => (
                  <Link key={item} href="/about/" className="transition-colors hover:text-[var(--text-secondary)]">
                    {item}
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
