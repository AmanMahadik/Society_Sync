import React from 'react';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { useRouter } from 'expo-router';

export default function HomeRoute() {
  const router = useRouter();

  const handleJumpTo = (key: string) => {
    router.push(`/(tabs)/${key}` as any);
  };

  return <HomeScreen jumpTo={handleJumpTo} />;
}
