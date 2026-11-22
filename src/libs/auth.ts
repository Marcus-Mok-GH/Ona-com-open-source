import type { SessionUser } from '@/libs/NeonAuth';
import { getSession } from '@/libs/NeonAuth';

export type { SessionUser };

export async function getUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}
