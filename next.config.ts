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
