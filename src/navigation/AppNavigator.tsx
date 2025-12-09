import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeScreen } from "../screens/HomeScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === "Home") {
                iconName = focused ? "home" : "home-outline";
              } else if (route.name === "Tasks") {
                iconName = focused ? "list" : "list-outline";
              } else if (route.name === "Reports") {
                iconName = focused ? "stats-chart" : "stats-chart-outline";
              } else {
                iconName = focused ? "person" : "person-outline";
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: "#3b82f6",
            tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",
            tabBarStyle: {
              backgroundColor: "#1e293b",
              borderTopColor: "rgba(255, 255, 255, 0.1)",
              borderTopWidth: 1,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            headerStyle: {
              backgroundColor: "#1e293b",
              borderBottomColor: "rgba(255, 255, 255, 0.1)",
              borderBottomWidth: 1,
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Home" }}
          />
          <Tab.Screen
            name="Tasks"
            component={TasksScreen}
            options={{ title: "Tasks" }}
          />
          <Tab.Screen
            name="Reports"
            component={ReportsScreen}
            options={{ title: "Reports" }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: "Profile" }}
          />
        </Tab.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};
