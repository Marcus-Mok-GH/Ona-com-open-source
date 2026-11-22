import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { blogPosts, learnEntries } from './content';

export const metadata: Metadata = {
  title: 'Blog — ONA',
  description: 'Guides and articles on background agents, automations, governance, and running AI software engineering in real environments.',
};

const guideOrder = ['agents', 'automations', 'environments', 'governance', 'code-migration', 'code-review', 'cve-remediation', 'backlog-automation', 'maintenance-agents'] as const;

const blogOrder = ['agent-sandbox-escape', 'ona-automations-launch', 'last-year-of-localhost'] as const;

function byOrder(source: Record<string, (typeof learnEntries)['agents']>, order: readonly string[]) {
  return order.map(slug => source[slug]).filter(entry => entry !== undefined);
}

function EntryCard({ entry }: { entry: (typeof learnEntries)['agents'] }) {
  return (
    <Link
      href={`/learn/${entry.slug}`}
      className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-2)]"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {entry.tag}
      </p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent)]">
        {entry.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">{entry.intro}</p>
      <span className="mt-4 font-mono text-sm font-medium text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]">
        Read more →
      </span>
    </Link>
  );
}

type Props = { params: Promise<{ locale: string }> };

export default async function LearnIndexPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const guides = byOrder(learnEntries, guideOrder);
  const posts = byOrder(blogPosts, blogOrder);

  return (
    <div>
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
          <p className="mb-6 font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Blog & guides
          </p>
          <h1 className="max-w-3xl text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.92] tracking-tighter text-[var(--text-primary)]">
            How background agents do real work.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            Practical guides on running AI software engineers — environments, automations, governance — and what we are learning shipping them.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Latest articles</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {posts.map(entry => (
              <EntryCard key={entry.slug} entry={entry} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Platform guides</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {guides.map(entry => (
              <EntryCard key={entry.slug} entry={entry} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
