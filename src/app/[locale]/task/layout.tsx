import { setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/libs/auth';
import { AppConfig } from '@/utils/AppConfig';

export default async function TaskLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) {
    const taskPath = locale === AppConfig.defaultLocale ? '/task' : `/${locale}/task`;
    // Keep the query string (e.g. ?c=<id>) so the user returns to the same chat after sign-in.
    const requested = (await headers()).get('x-return-to') ?? '';
    const returnPath = requested === taskPath || requested.startsWith(`${taskPath}?`) ? requested : taskPath;
    const signInPath = locale === AppConfig.defaultLocale ? '/sign-in' : `/${locale}/sign-in`;
    redirect(`${signInPath}?returnTo=${encodeURIComponent(returnPath)}`);
  }

  return (
    <div className="h-dvh bg-[var(--bg)]">
      {props.children}
    </div>
  );
}
