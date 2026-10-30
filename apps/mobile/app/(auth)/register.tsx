import React from 'react';
import { RegisterScreen } from '@/components/auth/RegisterScreen';
import { useRouter } from 'expo-router';

export default function RegisterRoute() {
  const router = useRouter();
  
  return (
    <RegisterScreen 
      onNavigateToLogin={() => router.replace('/(auth)/login')} 
    />
  );
}
