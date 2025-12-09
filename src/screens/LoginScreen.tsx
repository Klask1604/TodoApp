import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../contexts/AuthContext";

const inputTheme = {
  colors: {
    primary: "#3b82f6",
    onSurface: "#fff",
    outline: "rgba(255, 255, 255, 0.3)",
    onSurfaceVariant: "#fff",
    surface: "rgba(255, 255, 255, 0.15)",
    onPrimary: "#fff",
  },
};

export const LoginScreen = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("🔐 handleGoogleSignIn pressed");
      await signInWithGoogle();
    } catch (err: any) {
      const msg = err?.message || "Eroare la autentificare cu Google";
      console.error("❌ Google sign-in failed:", err);
      setError(msg);
      Alert.alert("Google Sign-In", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Te rog completează toate câmpurile");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { error: authError } = isSignUp
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (authError) {
        throw authError;
      }

      if (isSignUp) {
        setError("Cont creat! Verifică email-ul pentru confirmare.");
      }
    } catch (err: any) {
      setError(err.message || "Eroare la autentificare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#0f172a", "#1e293b", "#0f172a"]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Todo App</Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? "Crează cont nou"
                : "Autentifică-te pentru a continua"}
            </Text>

            {error && (
              <View
                style={[
                  styles.errorBox,
                  error.includes("creat") && styles.successBox,
                ]}
              >
                <Text
                  style={[
                    styles.errorText,
                    error.includes("creat") && styles.successText,
                  ]}
                >
                  {error}
                </Text>
              </View>
            )}

            <Button
              mode="outlined"
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={styles.googleButton}
              icon="google"
              textColor="#fff"
              labelStyle={styles.googleButtonText}
            >
              Continuă cu Google
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>SAU</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.labelContainer}>
                <Text style={styles.labelText}>Email</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                disabled={loading}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                mode="outlined"
                textColor="#fff"
                theme={inputTheme}
                outlineStyle={styles.inputOutline}
              />
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.labelContainer}>
                <Text style={styles.labelText}>Parolă</Text>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                disabled={loading}
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                mode="outlined"
                textColor="#fff"
                theme={inputTheme}
                outlineStyle={styles.inputOutline}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleEmailAuth}
              disabled={loading}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : isSignUp ? (
                "Crează cont"
              ) : (
                "Autentificare"
              )}
            </Button>

            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              style={styles.switchButton}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? "Ai deja cont? Autentifică-te"
                  : "Nu ai cont? Înregistrează-te"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "rgba(16, 224, 172, 0.16)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successBox: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
  },
  successText: {
    color: "#22c55e",
  },
  googleButton: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(18, 177, 129, 0.46)",
    backgroundColor: "rgb(30, 119, 107)",
  },
  googleButtonText: {
    color: "#fff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.5)",
    paddingHorizontal: 12,
    fontSize: 12,
  },
  inputWrapper: {
    marginBottom: 16,
    position: "relative",
  },
  labelContainer: {
    position: "absolute",
    top: -8,
    left: 12,
    zIndex: 1,
    backgroundColor: "rgb(30, 119, 107)",
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  labelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "rgba(20, 207, 192, 0.15)",
  },
  inputOutline: {
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: "rgb(30, 119, 107)",
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  switchButton: {
    marginTop: 16,
    padding: 8,
  },
  switchButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    fontSize: 14,
  },
});
