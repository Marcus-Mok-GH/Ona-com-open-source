import { setRequestLocale } from 'next-intl/server';
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
    const signInPath = locale === AppConfig.defaultLocale ? '/sign-in' : `/${locale}/sign-in`;
    redirect(`${signInPath}?returnTo=${encodeURIComponent(taskPath)}`);
  }

  return (
    <div className="h-dvh bg-[var(--bg)]">
      {props.children}
    </div>
  );
}
