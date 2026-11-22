import { checkPollinationsHealth } from '@/libs/Pollinations';

import { getDb } from '@/libs/DB';
import { logger } from '@/libs/Logger';
import { agentJobsSchema } from '@/models/Schema';
import { eq } from 'drizzle-orm';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type HealthCheckResult = {
  status: HealthStatus;
  timestamp: string;
  checks: {
    database: {
      status: HealthStatus;
      responseTime: number;
      message?: string;
    };

    externalApis: {
      pollinations: { status: HealthStatus; message?: string };
      orgo: { status: HealthStatus; message?: string };
    };
  };
  uptime: number;
  version: string;
};

const START_TIME = Date.now();
const HEALTH_CHECK_TIMEOUT = 5000;

async function checkDatabase(): Promise<{ status: HealthStatus; responseTime: number; message?: string }> {
  const start = Date.now();
  try {
    const db = await getDb();
    await Promise.race([
      db.execute('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database check timeout')), HEALTH_CHECK_TIMEOUT)
      ),
    ]);
    return { status: 'healthy', responseTime: Date.now() - start };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}



async function checkPollinations(): Promise<{ status: HealthStatus; message?: string }> {
  try {
    const result = await checkPollinationsHealth(3000);
    return result.ok
      ? { status: 'healthy' as HealthStatus }
      : { status: 'degraded' as HealthStatus, message: result.message };
  } catch {
    return { status: 'degraded' as HealthStatus, message: 'Unable to reach Pollinations AI' };
  }
}

async function checkOrgo(): Promise<{ status: HealthStatus; message?: string }> {
  try {
    const orgoApiKey = process.env.ORGO_API_KEY;
    if (!orgoApiKey) {
      return { status: 'healthy', message: 'ORGO_API_KEY not configured - skipping check' };
    }

    const response = await fetch('https://www.orgo.ai/api/workspaces', {
      method: 'GET',
      headers: { Authorization: `Bearer ${orgoApiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      return { status: 'healthy' };
    }
    return { status: 'degraded', message: `HTTP ${response.status}` };
  } catch {
    return { status: 'degraded', message: 'Unable to reach Orgo API' };
  }
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const [dbCheck, pollinationsCheck, orgoCheck] = await Promise.all([
    checkDatabase(),
    checkPollinations(),
    checkOrgo(),
  ]);

  let overallStatus: HealthStatus = 'healthy';
  if (dbCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (dbCheck.status === 'degraded' || pollinationsCheck.status === 'degraded' || orgoCheck.status === 'degraded') {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      externalApis: {
        pollinations: pollinationsCheck,
        orgo: orgoCheck,
      },
    },
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    version: process.env.npm_package_version || 'unknown',
  };
}

export function getReadinessStatus(healthResult: HealthCheckResult): { ready: boolean; reason?: string } {
  if (healthResult.status === 'unhealthy') {
    return { ready: false, reason: 'Service is unhealthy' };
  }
  if (healthResult.checks.database.status === 'unhealthy') {
    return { ready: false, reason: 'Database is unavailable' };
  }
  return { ready: true };
}
