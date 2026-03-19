// Layout principale — auth gate + Bottom Tab Navigator
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { useRecentPastiStore } from '../store/recentPastiStore';
import LoginScreen from './login';
import OggiScreen from './(tabs)/oggi';
import PastiScreen from './(tabs)/pasti';
import AllenamentoScreen from './(tabs)/allenamento';
import ProgressiScreen from './(tabs)/progressi';
import AccountModal from './account';

// Colori tema scuro
const COLORS = {
  bg: '#1A1A1A',
  bgElevated: '#242424',
  attivo: '#4A6741',
  inattivo: '#666666',
  testo: '#FFFFFF',
} as const;

type TabParamList = {
  Oggi: undefined;
  Pasti: undefined;
  Allenamento: undefined;
  Progressi: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
}

function tabIcon(
  iconeFocused: IoniconName,
  iconeUnfocused: IoniconName
): (props: TabIconProps) => React.JSX.Element {
  return ({ focused, color, size }: TabIconProps) => (
    <Ionicons
      name={focused ? iconeFocused : iconeUnfocused}
      size={size}
      color={color}
    />
  );
}

function SplashView(): React.JSX.Element {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#4A6741" />
    </View>
  );
}

export default function RootLayout(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accountVisibile, setAccountVisibile] = useState(false);

  const apriAccount = useCallback(() => setAccountVisibile(true), []);
  const chiudiAccount = useCallback(() => setAccountVisibile(false), []);

  useEffect(() => {
    // Sincronizza i pasti recenti dagli ultimi 7 giorni
    void useRecentPastiStore.getState().syncFromSupabase();
  }, []);

  useEffect(() => {
    // Controlla la sessione persistita in AsyncStorage
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingAuth(false);
    });

    // Ascolta login, logout e refresh token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Splash mentre verifica la sessione in AsyncStorage
  if (checkingAuth) {
    return <SplashView />;
  }

  // Nessuna sessione → schermata di login
  if (session === null) {
    return <LoginScreen />;
  }

  // Sessione attiva → tab navigator
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <NavigationContainer>
          <View style={styles.root}>
          <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.bgElevated,
            borderTopColor: '#333333',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: COLORS.attivo,
          tabBarInactiveTintColor: COLORS.inattivo,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Oggi"
          component={OggiScreen}
          options={{
            tabBarLabel: 'Oggi',
            tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline'),
          }}
        />
        <Tab.Screen
          name="Pasti"
          component={PastiScreen}
          options={{
            tabBarLabel: 'Pasti',
            tabBarIcon: tabIcon('restaurant', 'restaurant-outline'),
          }}
        />
        <Tab.Screen
          name="Allenamento"
          component={AllenamentoScreen}
          options={{
            tabBarLabel: 'Allenamento',
            tabBarIcon: tabIcon('barbell', 'barbell-outline'),
          }}
        />
        <Tab.Screen
          name="Progressi"
          component={ProgressiScreen}
          options={{
            tabBarLabel: 'Progressi',
            tabBarIcon: tabIcon('trending-up', 'trending-up-outline'),
          }}
        />
          </Tab.Navigator>

          {/* Bottone ⚙️ account — sovrapposto in alto a destra */}
          <TouchableOpacity
            style={styles.btnAccount}
            onPress={apriAccount}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={22} color="#888888" />
          </TouchableOpacity>
        </View>
      </NavigationContainer>

      <AccountModal visibile={accountVisibile} onChiudi={chiudiAccount} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
  },
  btnAccount: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,26,26,0.85)',
    borderRadius: 18,
  },
});
