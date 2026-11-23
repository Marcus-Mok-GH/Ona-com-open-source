import { setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/libs/auth';
import { AppConfig } from '@/utils/AppConfig';

export default async function ApiDocsLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) {
    const docsPath = locale === AppConfig.defaultLocale ? '/api-docs' : `/${locale}/api-docs`;
    // Keep the query string (e.g. ?c=<id>) so the user returns to the same chat after sign-in.
    const requested = (await headers()).get('x-return-to') ?? '';
    const returnPath = requested === docsPath || requested.startsWith(`${docsPath}?`) ? requested : docsPath;
    const signInPath = locale === AppConfig.defaultLocale ? '/sign-in' : `/${locale}/sign-in`;
    redirect(`${signInPath}?returnTo=${encodeURIComponent(returnPath)}`);
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      {props.children}
    </div>
  );
}
