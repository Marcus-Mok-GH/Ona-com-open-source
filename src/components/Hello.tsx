import { getTranslations } from 'next-intl/server';
import { Sponsors } from './Sponsors';

export const Hello = async () => {
  const t = await getTranslations('Dashboard');

  return (
    <>
      <p>
        {t.rich('alternative_message', {
          url: () => (
            <a
              className="text-blue-700 hover:border-b-2 hover:border-blue-700"
              href="https://nextjs-boilerplate.com/pro-saas-starter-kit"
              target="_blank"
              rel="noopener noreferrer"
            >
              Next.js Boilerplate SaaS
            </a>
          ),
        })}
      </p>
      <Sponsors />
    </>
  );
};
