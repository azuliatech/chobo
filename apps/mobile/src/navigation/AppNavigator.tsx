import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Platform } from 'react-native';
import SellScreen from '../screens/SellScreen';
import InventoryScreen from '../screens/InventoryScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MoreScreen from '../screens/MoreScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarShowLabel: true,
                    tabBarActiveTintColor: '#16a34a',
                    tabBarInactiveTintColor: '#9ca3af',
                    tabBarStyle: {
                        backgroundColor: '#111827',
                        borderTopColor: '#1f2937',
                        height: Platform.OS === 'ios' ? 88 : 64,
                        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                        paddingTop: 8,
                    },
                    tabBarIcon: ({ focused }) => {
                        const icons: Record<string, string> = {
                            Sell: '🛒',
                            Inventory: '📦',
                            Dashboard: '📊',
                            More: '⚙️',
                        };
                        return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
                    },
                })}
            >
                <Tab.Screen name="Sell" component={SellScreen} />
                <Tab.Screen name="Inventory" component={InventoryScreen} />
                <Tab.Screen name="Dashboard" component={DashboardScreen} />
                <Tab.Screen name="More" component={MoreScreen} />
            </Tab.Navigator>
        </NavigationContainer>
    );
}
