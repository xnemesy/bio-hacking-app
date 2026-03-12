// Layout principale con Bottom Tab Navigator a 4 tab
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import OggiScreen from './(tabs)/oggi';
import PastiScreen from './(tabs)/pasti';
import AllenamentoScreen from './(tabs)/allenamento';
import ProgressiScreen from './(tabs)/progressi';

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

export default function RootLayout(): React.JSX.Element {
  return (
    <NavigationContainer>
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
    </NavigationContainer>
  );
}
