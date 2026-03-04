import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '../src/services/supabase';
import { Session } from '@supabase/supabase-js';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();

  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // 1. Fetch the session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    // 2. Listen for authentication changes (e.g., user logs in or out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

useEffect(() => {
    if (!isInitialized) return;

    const isLoginScreen = pathname === '/';

    if (session && isLoginScreen) {
      router.replace('/(tabs)/dashboard');
    } else if (!session && !isLoginScreen) {
      router.replace('/');
    }

    SplashScreen.hideAsync();
    
  }, [session, isInitialized, pathname]);

  // Render nothing until we are initialized to prevent UI flickering
  if (!isInitialized) {
    return null;
  }

return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Login Screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* Tab Navigator */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Entry Screen */}
        <Stack.Screen 
          name="add-entry" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
