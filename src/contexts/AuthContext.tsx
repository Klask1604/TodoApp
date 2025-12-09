import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "../config/supabase";
import { UserProfile } from "../types";

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

  // 🔧 Configurare Google Sign In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
      offlineAccess: true,
    });
  }, []);

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
      }
    } catch (error) {
      console.error("❌ Exception loading profile:", error);
    }
  };

  // 🚀 FUNCȚIA NOUĂ - Google Native Sign In
  const signInWithGoogle = async () => {
    try {
      console.log("🔐 Starting Google native sign-in...");

      // 1. Verifică Google Play Services (Android)
      await GoogleSignin.hasPlayServices();
      console.log("✅ Play Services available");

      // 2. Sign in cu Google
      const userInfo = await GoogleSignin.signIn();
      console.log("✅ Google sign in successful");

      // 3. Obține ID Token
      const tokens = await GoogleSignin.getTokens();
      console.log("🔑 Got tokens");

      if (!tokens.idToken) {
        throw new Error("No ID token received from Google");
      }

      // 4. Autentifică cu Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: tokens.idToken,
      });

      if (error) {
        console.error("❌ Supabase auth error:", error);
        throw error;
      }

      console.log("✅ Successfully authenticated with Google!");
    } catch (error: any) {
      console.error("❌ Google sign-in error:", error);

      // Cleanup Google session on error
      try {
        await GoogleSignin.signOut();
      } catch (cleanupError) {
        console.error("Error cleaning up Google session:", cleanupError);
      }

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
    try {
      // Sign out din Google
      await GoogleSignin.signOut();
    } catch (error) {
      console.log("Google sign out:", error);
    }

    // Sign out din Supabase
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
