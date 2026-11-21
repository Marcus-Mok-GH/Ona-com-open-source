import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AppConfig } from '@/utils/AppConfig';
import { AuthForm } from './AuthForm';

type ISignInPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  callback_failed: 'Sign-in could not be completed. Please try again.',
  login_failed: 'Sign-in could not be started. Please try again.',
  missing_claims: 'Sign-in did not return the account details needed. Please try again.',
  provider_error: 'Sign-in was cancelled or could not be completed. Please try again.',
  session_expired: 'Your sign-in session expired. Please try again.',
};

const highlights = [
  {
    title: 'Background agents',
    body: 'Delegate real engineering work to agents that run in isolated VMs while you keep momentum.',
  },
  {
    title: 'Audit-ready progress',
    body: 'Every task keeps a reviewable trail — plans, actions, and verified results you can trust.',
  },
  {
    title: 'Take over any time',
    body: 'Step in the moment you want control. Hand the work back when you are done.',
  },
];

export async function generateMetadata(props: ISignInPageProps) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'SignIn',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SignInPage(props: ISignInPageProps) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  setRequestLocale(locale);
  const defaultReturnTo = locale === AppConfig.defaultLocale ? '/dashboard' : `/${locale}/dashboard`;
  const returnTo = searchParams.returnTo?.startsWith('/')
    && !searchParams.returnTo.startsWith('//')
    && !searchParams.returnTo.startsWith('/api/')
    ? searchParams.returnTo
    : defaultReturnTo;
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] || errorMessages.callback_failed : null;

  return (
    <div
      className="relative min-h-dvh overflow-hidden text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-[-10%] size-[560px] rounded-full opacity-[0.16] blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-[-140px] right-[-6%] size-[480px] rounded-full opacity-[0.10] blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 90% 80% at 30% 40%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 30% 40%, black 30%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6 lg:grid lg:grid-cols-[1fr_420px] lg:gap-16 lg:px-10">
        <div className="flex flex-1 flex-col justify-center py-14 max-lg:order-2">
          <div className="max-w-md">
            <a href="/" className="mb-10 inline-flex items-baseline gap-2 max-lg:hidden">
              <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">ONA</span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">but open source</span>
            </a>
            <h1 className="text-4xl font-bold leading-[0.95] tracking-tighter text-[var(--text-primary)] sm:text-5xl">
              Background agents
              <br />
              for software teams
            </h1>
            <p className="mt-5 text-lg leading-snug tracking-[-0.01em] text-[var(--text-secondary)]">
              Sign in to assign tasks, review progress, and ship faster — from anywhere, on any device.
            </p>

            <ul className="mt-10 space-y-6 border-t border-[var(--border)] pt-8 max-sm:hidden">
              {highlights.map((highlight, index) => (
                <li key={highlight.title} className="flex gap-5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 font-mono text-[10px] font-semibold tabular-nums"
                    style={{ color: 'var(--accent)' }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                      {highlight.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {highlight.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative flex flex-1 items-center max-lg:order-1 lg:py-14">
          <div className="w-full max-w-sm">
            <div
              className="rounded-2xl border border-[var(--border)] p-6 shadow-xl shadow-black/[0.04] sm:p-8 dark:shadow-black/40"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <AuthForm returnTo={returnTo} initialError={errorMessage} />
            </div>

            <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
              <a
                href="/"
                className="transition-colors hover:text-[var(--text-secondary)]"
              >
                ← Back to home
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
