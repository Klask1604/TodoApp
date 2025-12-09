// src/components/NotificationSettings.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Switch, Divider, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../contexts/NotificationsContext";
import { NotificationsService } from "../services/notifications";
import * as Notifications from "expo-notifications";

export const NotificationSettings = () => {
  const { isRegistered, expoPushToken } = useNotifications();
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState({
    hour: 9,
    minute: 0,
  });
  const [taskRemindersEnabled, setTaskRemindersEnabled] = useState(true);
  const [overdueAlertsEnabled, setOverdueAlertsEnabled] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    loadScheduledNotifications();
  }, []);

  const loadScheduledNotifications = async () => {
    const scheduled = await NotificationsService.getScheduledNotifications();
    setScheduledCount(scheduled.length);

    // Verifică dacă există daily reminder programat
    const hasDailyReminder = scheduled.some(
      (n) => n.content.data?.type === "daily_reminder"
    );
    setDailyReminderEnabled(hasDailyReminder);
  };

  const handleDailyReminderToggle = async (enabled: boolean) => {
    if (enabled) {
      const notificationId = await NotificationsService.scheduleDailyReminder(
        dailyReminderTime.hour,
        dailyReminderTime.minute
      );

      if (notificationId) {
        setDailyReminderEnabled(true);
        Alert.alert(
          "Success",
          `Daily reminder programat pentru ${
            dailyReminderTime.hour
          }:${dailyReminderTime.minute.toString().padStart(2, "0")}`
        );
      } else {
        Alert.alert("Error", "Failed to schedule daily reminder");
      }
    } else {
      // Anulează toate notificările programate de tip daily_reminder
      const scheduled = await NotificationsService.getScheduledNotifications();
      for (const notification of scheduled) {
        if (notification.content.data?.type === "daily_reminder") {
          await NotificationsService.cancelNotification(
            notification.identifier
          );
        }
      }
      setDailyReminderEnabled(false);
      Alert.alert("Success", "Daily reminder anulat");
    }

    await loadScheduledNotifications();
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to cancel all scheduled notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await NotificationsService.cancelAllNotifications();
            setScheduledCount(0);
            setDailyReminderEnabled(false);
            Alert.alert("Success", "All notifications cleared");
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    // Verifică permisiunile înainte
    const { status } = await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications in your device settings first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Request Permission",
            onPress: handleRequestPermissions,
          },
        ]
      );
      return;
    }

    const success = await NotificationsService.sendLocalNotification(
      "🔔 Test Notification",
      "Notifications are working perfectly!",
      { type: "test" }
    );

    if (success) {
      Alert.alert(
        "✅ Success",
        "Test notification sent! Check your notification tray.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "❌ Error",
        "Failed to send test notification. Please check your notification permissions.",
        [{ text: "OK" }]
      );
    }
  };

  const handleRequestPermissions = async () => {
    const token = await NotificationsService.registerForPushNotifications();
    if (token) {
      Alert.alert("Success", "Notifications enabled successfully!");
    } else {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications in your device settings."
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>
          Manage how and when you receive notifications
        </Text>
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={isRegistered ? "checkmark-circle" : "close-circle"}
              size={24}
              color={isRegistered ? "#22c55e" : "#ef4444"}
            />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {isRegistered
                  ? "Notifications Enabled"
                  : "Notifications Disabled"}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isRegistered
                  ? "You will receive push notifications"
                  : "Enable notifications to get reminders"}
              </Text>
            </View>
          </View>

          {!isRegistered && (
            <Button
              mode="contained"
              onPress={handleRequestPermissions}
              style={styles.enableButton}
              buttonColor="#3b82f6"
            >
              Enable Notifications
            </Button>
          )}

          {isRegistered && expoPushToken && (
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Push Token:</Text>
              <Text style={styles.tokenText} numberOfLines={1}>
                {expoPushToken}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="alarm" size={20} color="#3b82f6" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Task Reminders</Text>
              <Text style={styles.settingSubtitle}>
                Get notified before tasks are due
              </Text>
            </View>
          </View>
          <Switch
            value={taskRemindersEnabled}
            onValueChange={setTaskRemindersEnabled}
            color="#3b82f6"
            disabled={!isRegistered}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="time" size={20} color="#ef4444" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Overdue Alerts</Text>
              <Text style={styles.settingSubtitle}>
                Notify when tasks become overdue
              </Text>
            </View>
          </View>
          <Switch
            value={overdueAlertsEnabled}
            onValueChange={setOverdueAlertsEnabled}
            color="#3b82f6"
            disabled={!isRegistered}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="sunny" size={20} color="#f59e0b" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Daily Reminder</Text>
              <Text style={styles.settingSubtitle}>
                Morning summary of today's tasks
              </Text>
            </View>
          </View>
          <Switch
            value={dailyReminderEnabled}
            onValueChange={handleDailyReminderToggle}
            color="#3b82f6"
            disabled={!isRegistered}
          />
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>

        <View style={styles.statCard}>
          <View style={styles.statRow}>
            <Ionicons name="notifications" size={20} color="#3b82f6" />
            <Text style={styles.statLabel}>Scheduled Notifications</Text>
          </View>
          <Text style={styles.statValue}>{scheduledCount}</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleTestNotification}
        >
          <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
          <Text style={styles.actionText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadScheduledNotifications}
        >
          <Ionicons name="refresh" size={20} color="#3b82f6" />
          <Text style={styles.actionText}>Refresh Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleClearAllNotifications}
          disabled={scheduledCount === 0}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
          <Text style={[styles.actionText, styles.dangerText]}>
            Clear All Notifications
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Notifications work best when the app is closed or in the background.
          Make sure to allow notifications in your device settings.
        </Text>
      </View>

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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
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
  statusCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  enableButton: {
    marginTop: 16,
  },
  tokenContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
  },
  tokenLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 11,
    color: "#3b82f6",
    fontFamily: "Courier",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  divider: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 20,
  },
  statCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  dangerButton: {
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  dangerText: {
    color: "#ef4444",
  },
  infoBox: {
    flexDirection: "row",
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#60a5fa",
    lineHeight: 18,
  },
});
