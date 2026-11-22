import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { SessionHeaderActions } from '@/components/SessionHeaderActions';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <BaseTemplate
      leftNav={(
        <>
          <li>
            <Link href="/about/" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]">
              Platform
            </Link>
          </li>
          <li>
            <Link href="/portfolio/" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]">
              Use cases
            </Link>
          </li>
          <li>
            <Link href="/learn/" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]">
              Blog
            </Link>
          </li>
          <li>
            <Link href="/customer-stories/" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-primary)]">
              Customers
            </Link>
          </li>
        </>
      )}
      rightNav={<SessionHeaderActions locale={locale} />}
    >
      {props.children}
    </BaseTemplate>
  );
}
