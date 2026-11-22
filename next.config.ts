import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const baseConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    dirs: ['.'],
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    '*.replit.dev',
    '*.kirk.replit.dev',
    '*.picard.replit.dev',
    '*.repl.co',
    ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
  ],
  poweredByHeader: false,
  // Legacy /app URLs -> /task. Conversation IDs are unchanged.
  // Old links used either ?c=<id> (chat page) or ?conversationId=<id> (dashboard);
  // both end up as /task?c=<id>. Other query params are passed through by Next.
  async redirects() {
    return [
      { source: '/app/api-docs', destination: '/api-docs', permanent: true },
      { source: '/:locale(fr)/app/api-docs', destination: '/:locale/api-docs', permanent: true },
      {
        source: '/app',
        has: [{ type: 'query', key: 'conversationId', value: '(?<id>.+)' }],
        destination: '/task?c=:id',
        permanent: true,
      },
      {
        source: '/:locale(fr)/app',
        has: [{ type: 'query', key: 'conversationId', value: '(?<id>.+)' }],
        destination: '/:locale/task?c=:id',
        permanent: true,
      },
      { source: '/app', destination: '/task', permanent: true },
      { source: '/:locale(fr)/app', destination: '/:locale/task', permanent: true },
    ];
  },
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: ['playwright', 'ws'],
  // `src/libs/DB.ts` loads SQL migrations from ./migrations at request time via
  // `path.join(process.cwd(), 'migrations')`, which the file tracer cannot see.
  // Explicitly include them so auto-migration also works on Vercel/serverless.
  outputFileTracingIncludes: {
    '/**': ['./migrations/**'],
  },
};

const nextIntlConfig = createNextIntlPlugin('./src/libs/I18n.ts')(baseConfig);

const configWithPlugins = nextIntlConfig;

export default configWithPlugins;
