import Image from 'next/image';

const sponsors = [
  {
    name: 'Clerk',
    alt: 'Clerk – Authentication & User Management for Next.js',
    href: 'https://clerk.com?utm_source=github&utm_medium=sponsorship&utm_campaign=nextjs-boilerplate',
    src: '/assets/images/clerk-logo-dark.png',
  },
  {
    name: 'CodeRabbit',
    alt: 'CodeRabbit',
    href: 'https://www.coderabbit.ai?utm_source=next_js_starter&utm_medium=github&utm_campaign=next_js_starter_oss_2025',
    src: '/assets/images/coderabbit-logo-light.svg',
  },
  {
    name: 'Sentry',
    alt: 'Sentry',
    href: 'https://sentry.io/for/nextjs/?utm_source=github&utm_medium=paid-community&utm_campaign=general-fy25q1-nextjs&utm_content=github-banner-nextjsboilerplate-logo',
    src: '/assets/images/sentry-dark.png',
  },
  {
    name: 'Arcjet',
    alt: 'Arcjet',
    href: 'https://launch.arcjet.com/Q6eLbRE',
    src: '/assets/images/arcjet-light.svg',
  },
  {
    name: 'Sevalla',
    alt: 'Sevalla',
    href: 'https://sevalla.com/',
    src: '/assets/images/sevalla-light.png',
  },
  {
    name: 'Crowdin',
    alt: 'Crowdin',
    href: 'https://l.crowdin.com/next-js',
    src: '/assets/images/crowdin-dark.png',
  },
  {
    name: 'SurveyJS',
    alt: 'SurveyJS',
    href: 'https://surveyjs.io/?utm_source=nextjs_readme&utm_medium=banner&utm_campaign=q3_2025',
    src: '/assets/images/surveyjs.svg',
  },
  {
    name: 'PostHog',
    alt: 'PostHog',
    href: 'https://posthog.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=next-js-boilerplate',
    src: 'https://posthog.com/brand/posthog-logo.svg',
  },
  {
    name: 'Better Stack',
    alt: 'Better Stack',
    href: 'https://betterstack.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=next-js-boilerplate',
    src: '/assets/images/better-stack-dark.png',
  },
  {
    name: 'Checkly',
    alt: 'Checkly',
    href: 'https://www.checklyhq.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=next-js-boilerplate',
    src: '/assets/images/checkly-logo-light.png',
  },
  {
    name: 'Next.js SaaS Boilerplate',
    alt: 'Next.js SaaS Boilerplate',
    href: 'https://nextjs-boilerplate.com/pro-saas-starter-kit',
    src: '/assets/images/nextjs-boilerplate-saas.png',
  },
];

const rows = Array.from({ length: Math.ceil(sponsors.length / 3) }, (_, i) =>
  sponsors.slice(i * 3, i * 3 + 3));

export const Sponsors = () => (
  <table className="border-collapse">
    <tbody>
      {rows.map(row => (
        <tr key={row[0]?.name} className="h-56">
          {row.map(sponsor => (
            <td
              key={sponsor.name}
              className="border-2 border-gray-300 p-3 dark:border-gray-700"
            >
              <a href={sponsor.href} target="_blank" rel="noopener noreferrer">
                <Image
                  src={sponsor.src}
                  alt={sponsor.alt}
                  width={260}
                  height={224}
                />
              </a>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
