import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Avatar, TextInput, Button, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { NotificationSettings } from "../components/NotificationSettings";

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

export const ProfileScreen = () => {
  const { profile, updateProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile({
        display_name: displayName,
        avatar_url: avatarUrl || undefined,
        phone_number: phoneNumber || undefined,
      });
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        onPress: signOut,
        style: "destructive",
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <NotificationSettings />
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarContainer}>
        <Avatar.Image
          size={100}
          source={
            avatarUrl ? { uri: avatarUrl } : require("../../assets/icon.png")
          }
        />
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputWrapper}>
          <View style={styles.labelContainer}>
            <Text style={styles.labelText}>Display Name</Text>
          </View>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            mode="outlined"
            textColor="#fff"
            theme={inputTheme}
            outlineStyle={styles.inputOutline}
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.labelContainer}>
            <Text style={styles.labelText}>Avatar URL</Text>
          </View>
          <TextInput
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            style={styles.input}
            mode="outlined"
            placeholder="https://example.com/avatar.jpg"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            textColor="#fff"
            theme={inputTheme}
            outlineStyle={styles.inputOutline}
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.labelContainer}>
            <Text style={styles.labelText}>Email</Text>
          </View>
          <TextInput
            value={profile?.email}
            disabled
            style={styles.input}
            mode="outlined"
            textColor="rgba(255, 255, 255, 0.6)"
            theme={inputTheme}
            outlineStyle={styles.inputOutline}
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.labelContainer}>
            <Text style={styles.labelText}>Phone Number (Optional)</Text>
          </View>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={styles.input}
            mode="outlined"
            placeholder="40712345678 sau 0712345678"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            keyboardType="phone-pad"
            textColor="#fff"
            theme={inputTheme}
            outlineStyle={styles.inputOutline}
          />
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.noticeText}>
            Add your phone number to enable WhatsApp task creation in the future
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
          buttonColor="#3b82f6"
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoItem}>
          <Ionicons name="code-slash" size={20} color="rgba(255,255,255,0.5)" />
          <Text style={styles.infoText}>Version 1.0.0</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="calendar" size={20} color="rgba(255,255,255,0.5)" />
          <Text style={styles.infoText}>
            Member since{" "}
            {new Date(profile?.created_at || "").toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  avatarContainer: {
    alignItems: "center",
    padding: 20,
  },
  email: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 12,
  },
  form: {
    padding: 20,
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
    backgroundColor: "rgb(52, 86, 168)",
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  inputOutline: {
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1,
  },
  notice: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#60a5fa",
    marginLeft: 12,
  },
  saveButton: {
    marginTop: 8,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: 12,
  },
  divider: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 20,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
    marginLeft: 8,
  },
});
