import { useAuth } from '../lib/auth-context';

export function useSocietyId(): string | null {
  const { profile } = useAuth();
  return profile?.society_id ?? null;
}
