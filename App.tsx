// App.tsx - UPDATED with NotificationsProvider and Deep Linking
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Linking } from "react-native";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { DataProvider } from "./src/contexts/DataContext";
import { NotificationsProvider } from "./src/contexts/NotificationsContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { LoginScreen } from "./src/screens/LoginScreen";
import { supabase } from "./src/config/supabase";

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
  // 🔗 Handle deep linking pentru OAuth callback
  useEffect(() => {
    // Listener pentru deep links (când app-ul este deschis)
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log("🔗 Deep link received:", url);

      // Verifică dacă este callback de la OAuth
      if (url.includes('auth/callback')) {
        // Extrage hash-ul din URL (conține session info)
        const urlObj = new URL(url);
        const hash = urlObj.hash;

        if (hash) {
          console.log("🔑 Processing OAuth callback...");
          // Supabase va prelua automat session-ul din URL
          await supabase.auth.getSession();
        }
      }
    };

    // Verifică dacă app-ul a fost deschis prin deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listener pentru deep links ulterioare
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          {/* 🆕 NotificationsProvider trebuie să fie înăuntru AuthProvider
              dar în afara DataProvider pentru a avea acces la user */}
          <NotificationsProvider>
            <DataProvider>
              <StatusBar style="light" />
              <AppContent />
            </DataProvider>
          </NotificationsProvider>
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
