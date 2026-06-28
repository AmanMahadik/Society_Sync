import React from 'react';
import { LoginScreen } from '../../components/auth/LoginScreen';
import { useRouter } from 'expo-router';

export default function LoginRoute() {
  const router = useRouter();
  return (
    <LoginScreen 
      onNavigateToRegister={() => router.replace('/(auth)/register')} 
    />
  );
}
