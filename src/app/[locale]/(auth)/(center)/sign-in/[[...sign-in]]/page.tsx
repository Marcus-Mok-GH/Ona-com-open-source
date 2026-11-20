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
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
        Sign in to ONA
      </h1>
      <p style={{ color: '#666', marginBottom: '32px', fontSize: '15px' }}>
        Sign in with your email and password, or create a new account.
      </p>

      {errorMessage && (
        <p style={{ color: '#b3261e', marginBottom: '16px', fontSize: '14px' }}>
          {errorMessage}
        </p>
      )}

      <AuthForm returnTo={returnTo} />
    </div>
  );
}