import { redirect } from 'next/navigation';
import { getUser } from '@/libs/auth';
import { AppConfig } from '@/utils/AppConfig';
import { ApiKeysPanel, CreditsTopup, DarkModeToggle, SignOutButton } from './SettingsActions';

function getInitials(firstName: string | null, lastName: string | null, email: string | null): string {
  const f = (firstName ?? '').trim();
  const l = (lastName ?? '').trim();
  if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase().replace(/\s/g, '') || '?';
  const e = (email ?? '').trim();
  return e ? e.charAt(0).toUpperCase() : '?';
}

function getDisplayName(firstName: string | null, lastName: string | null, email: string | null): string {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full || email || 'Account';
}

type Props = { params: Promise<{ locale: string }> };

export default async function UserProfilePage(props: Props) {
  const { locale } = await props.params;
  const user = await getUser();

  if (!user) {
    const settingsPath = locale === AppConfig.defaultLocale ? '/dashboard/user-profile' : `/${locale}/dashboard/user-profile`;
    const signInPath = locale === AppConfig.defaultLocale ? '/sign-in' : `/${locale}/sign-in`;
    redirect(`${signInPath}?returnTo=${encodeURIComponent(settingsPath)}`);
  }

  const initials = getInitials(user.firstName, user.lastName, user.email);
  const displayName = getDisplayName(user.firstName, user.lastName, user.email);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>

      <div className="space-y-4">
        <section
          className="rounded-2xl border border-black/8 dark:border-white/10 p-6"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Profile</h2>
          <div className="flex items-center gap-4">
            {user.profileImageUrl
              ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profileImageUrl}
                    alt={displayName}
                    className="size-14 rounded-full object-cover ring-2 ring-black/8 dark:ring-white/10"
                  />
                )
              : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-lg font-semibold text-white dark:text-gray-900">
                    {initials}
                  </span>
                )}
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
              {user.email && (
                <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              )}
              <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">ID: {user.id}</p>
            </div>
          </div>
        </section>

        <section
          className="rounded-2xl border border-black/8 dark:border-white/10 p-6"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Appearance</h2>
          <DarkModeToggle />
        </section>

        <section
          className="rounded-2xl border border-black/8 dark:border-white/10 p-6"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Credits</h2>
          <CreditsTopup />
        </section>

        <section
          className="rounded-2xl border border-black/8 dark:border-white/10 p-6"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">API keys</h2>
          <ApiKeysPanel />
        </section>

        <section
          className="rounded-2xl border border-black/8 dark:border-white/10 p-6"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Account</h2>
          <SignOutButton />
        </section>
      </div>
    </div>
  );
}
