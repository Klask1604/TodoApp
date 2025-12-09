import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { DataProvider } from "./src/contexts/DataContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { LoginScreen } from "./src/screens/LoginScreen";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#3b82f6",
    background: "#0f172a",
    surface: "#1e293b",
    text: "#fff",
  },
};

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <DataProvider>
            <StatusBar style="light" />
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
});
