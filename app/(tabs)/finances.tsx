import React from 'react';
import { FinancesScreen } from '@/components/screens/FinancesScreen';
import { MasterUsersScreen } from '@/components/screens/MasterUsersScreen';
import { useAuth } from '@/lib/auth-context';

export default function FinancesRoute() {
  const { profile } = useAuth();
  
  if (profile?.role === 'master_admin') {
    return <MasterUsersScreen />;
  }
  return <FinancesScreen />;
}
