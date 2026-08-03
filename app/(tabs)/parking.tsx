import React from 'react';
import { ParkingScreen } from '@/components/screens/ParkingScreen';
import { MasterSocietiesScreen } from '@/components/screens/MasterSocietiesScreen';
import { useAuth } from '@/lib/auth-context';

export default function ParkingRoute() {
  const { profile } = useAuth();
  
  if (profile?.role === 'master_admin') {
    return <MasterSocietiesScreen />;
  }
  return <ParkingScreen />;
}
