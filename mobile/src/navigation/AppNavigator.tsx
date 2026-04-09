import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { useGeofencing } from "../hooks/useGeofencing";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import { Colors } from "../constants/colors";

import { OnboardingScreen } from "../screens/OnboardingScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { WarehouseDetailScreen } from "../screens/WarehouseDetailScreen";
import { MyStatusScreen } from "../screens/MyStatusScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MapIcon({ color }: { color: string }) {
  return (
    <View style={[styles.tabIcon, { borderColor: color }]}>
      <Text style={[styles.tabIconText, { color }]}>K</Text>
    </View>
  );
}

function StatusIcon({ color }: { color: string }) {
  return (
    <View style={[styles.tabIcon, { borderColor: color }]}>
      <Text style={[styles.tabIconText, { color }]}>S</Text>
    </View>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <View style={[styles.tabIcon, { borderColor: color }]}>
      <Text style={[styles.tabIconText, { color }]}>P</Text>
    </View>
  );
}

function MainTabs() {
  useGeofencing();
  useRealtimeUpdates();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.gray200,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.gray900,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Karta",
          tabBarIcon: MapIcon,
          headerTitle: "Waitino",
          headerTitleStyle: {
            fontWeight: "800",
            color: Colors.primary,
            fontSize: 20,
          },
        }}
      />
      <Tab.Screen
        name="MyStatus"
        component={MyStatusScreen}
        options={{
          title: "Moj Status",
          tabBarIcon: StatusIcon,
          headerTitle: "Moj Status",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Postavke",
          tabBarIcon: SettingsIcon,
          headerTitle: "Postavke",
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="WarehouseDetail"
              component={WarehouseDetailScreen}
              options={{
                headerShown: true,
                headerTitle: "Detalji skladišta",
                headerStyle: { backgroundColor: Colors.white },
                headerTintColor: Colors.gray900,
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
