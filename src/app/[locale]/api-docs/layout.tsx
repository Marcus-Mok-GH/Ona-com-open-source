import { setRequestLocale } from 'next-intl/server';
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
    const signInPath = locale === AppConfig.defaultLocale ? '/sign-in' : `/${locale}/sign-in`;
    redirect(`${signInPath}?returnTo=${encodeURIComponent(docsPath)}`);
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      {props.children}
    </div>
  );
}
