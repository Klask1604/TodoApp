import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../config/supabase";
import { UserProfile } from "../types";
import { makeRedirectUri } from "expo-auth-session";

// Configurare pentru a închide browserul după autentificare
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const loadInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("❌ Error getting initial session:", error);
          setLoading(false);
          return;
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("🔄 Auth state changed:", _event);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    const appStateSub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        console.log("📱 App became active, checking session...");
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          if (data.session.user) {
            await loadProfile(data.session.user.id);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("❌ Error loading profile:", error);
        return;
      }

      if (data) {
        setProfile(data);
        console.log("✅ Profile loaded");
      } else {
        // Profilul nu există, creează unul nou (prima autentificare)
        console.log("📝 Creating new profile for user:", userId);
        await createProfile(userId);
      }
    } catch (error) {
      console.error("❌ Exception loading profile:", error);
    }
  };

  const createProfile = async (userId: string) => {
    try {
      // Obține detaliile user-ului pentru a seta numele inițial
      const { data: { user } } = await supabase.auth.getUser();

      const newProfile = {
        id: userId,
        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        avatar_url: user?.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating profile:", error);
        return;
      }

      if (data) {
        setProfile(data);
        console.log("✅ Profile created successfully");
      }
    } catch (error) {
      console.error("❌ Exception creating profile:", error);
    }
  };

  // 🚀 Google OAuth Sign In (folosind Supabase OAuth)
  const signInWithGoogle = async () => {
    try {
      console.log("🔐 Starting Google OAuth with Supabase...");

      // Pentru Expo Go, folosim URL-ul generat automat de Expo
      // În development: exp://192.168.1.X:8081/--/auth/callback
      // În production: todoapp://auth/callback
      const redirectUrl = makeRedirectUri({
        scheme: undefined, // Lasă Expo să decidă (exp:// sau todoapp://)
        path: 'auth/callback'
      });

      console.log("📍 Redirect URI:", redirectUrl);

      // Folosește Supabase OAuth cu Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("❌ Supabase OAuth error:", error);
        throw error;
      }

      // Deschide browserul pentru autentificare
      if (data.url) {
        console.log("🌐 Opening browser for OAuth...");
        console.log("🔗 OAuth URL:", data.url);

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log("🔙 Browser result:", result);

        if (result.type === "success") {
          // URL-ul de callback conține session info
          console.log("✅ OAuth redirect successful!");
          console.log("📦 Result URL:", result.url);

          // Extrage token-urile din URL
          if (result.url) {
            const url = new URL(result.url);
            const params = new URLSearchParams(url.hash.substring(1)); // Remove # și parsează
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken) {
              console.log("🔑 Setting session from tokens...");
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (sessionError) {
                console.error("❌ Error setting session:", sessionError);
              } else if (sessionData.user) {
                console.log("✅ Session set, loading profile...");
                // Forțează încărcarea profilului imediat
                await loadProfile(sessionData.user.id);
              }
            }
          }
        } else if (result.type === "cancel") {
          console.log("⚠️ User cancelled OAuth");
        }
      }
    } catch (error: any) {
      console.error("❌ Google sign-in error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    // Sign out din Supabase (web OAuth nu necesită sign out separat)
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    await supabase.from("profiles").update(updates).eq("id", user.id);
    await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
