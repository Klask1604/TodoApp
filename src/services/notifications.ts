// src/services/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "../config/supabase";

// Configurare comportament notificări
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationsService {
  /**
   * Înregistrează dispozitivul pentru push notifications și returnează token-ul
   */
  static async registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    // Verifică dacă este dispozitiv fizic (nu emulator)
    if (!Device.isDevice) {
      console.log("Push notifications funcționează doar pe dispozitive fizice");
      return null;
    }

    try {
      // Verifică permisiuni existente
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Dacă nu sunt acordate, cere permisiuni
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Permisiune pentru notificări refuzată");
        return null;
      }

      // Configurări specifice Android (trebuie făcut înainte de a obține token)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#3b82f6",
        });
      }

      // Obține Expo push token
      // Notă: În Expo Go pe Android (SDK 53+), remote push nu este suportat
      // Local notifications funcționează perfect!
      try {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: "cbd6448d-ddd1-4f90-80ae-608e8738dfce", // din app.json
          })
        ).data;

        console.log("✅ Push token obținut:", token);
      } catch (pushTokenError: any) {
        const errorMessage = pushTokenError?.message || "";

        // Expo Go pe Android nu mai suportă remote push din SDK 53
        if (
          errorMessage.includes("Expo Go") ||
          errorMessage.includes("development build") ||
          errorMessage.includes("Firebase") ||
          errorMessage.includes("FCM")
        ) {
          console.log(
            "ℹ️ Remote push notifications nu sunt disponibile în Expo Go pe Android.\n" +
            "✅ Local notifications (task reminders) funcționează perfect!\n" +
            "📱 Pentru remote push, folosește EAS Build: npx eas build"
          );
          // Returnăm null - notificările locale vor funcționa
          return null;
        }

        // Pentru alte erori neașteptate
        console.warn("⚠️ Eroare neașteptată la obținere push token:", errorMessage);
        return null;
      }

      return token;
    } catch (error) {
      console.error("❌ Eroare la înregistrare push notifications:", error);
      // Returnăm null în loc să aruncăm eroarea - permite notificări locale
      return null;
    }
  }

  /**
   * Salvează push token în Supabase pentru utilizatorul curent
   */
  static async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase.from("push_tokens").upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,platform",
        }
      );

      if (error) throw error;
      console.log("✅ Push token salvat în Supabase");
    } catch (error) {
      console.error("❌ Eroare la salvare push token:", error);
    }
  }

  /**
   * Șterge push token din Supabase (la logout)
   */
  static async deletePushToken(userId: string): Promise<void> {
    try {
      await supabase
        .from("push_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("platform", Platform.OS);

      console.log("✅ Push token șters");
    } catch (error) {
      console.error("❌ Eroare la ștergere push token:", error);
    }
  }

  /**
   * Programează notificare locală pentru un task
   */
  static async scheduleTaskNotification(
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    minutesBefore: number = 60 // notificare cu 1h înainte
  ): Promise<string | null> {
    try {
      const triggerDate = new Date(dueDate.getTime() - minutesBefore * 60000);

      // Nu programa notificări pentru trecut
      if (triggerDate <= new Date()) {
        console.log("⚠️ Data notificării este în trecut, skip");
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Task Reminder",
          body: `"${taskTitle}" expiră în ${minutesBefore} minute!`,
          data: { taskId, type: "task_reminder" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      console.log("✅ Notificare programată:", notificationId);
      return notificationId;
    } catch (error) {
      console.error("❌ Eroare la programare notificare:", error);
      return null;
    }
  }

  /**
   * Anulează notificare programată
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log("✅ Notificare anulată:", notificationId);
    } catch (error) {
      console.error("❌ Eroare la anulare notificare:", error);
    }
  }

  /**
   * Anulează toate notificările programate
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("✅ Toate notificările au fost anulate");
    } catch (error) {
      console.error("❌ Eroare la anulare notificări:", error);
    }
  }

  /**
   * Trimite notificare locală imediată
   */
  static async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      // Verifică permisiunile înainte
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        console.warn("⚠️ Permisiuni pentru notificări nu sunt acordate");
        return false;
      }

      // Trimite notificarea imediat (cu trigger în viitorul foarte apropiat)
      // Folosim 1 secundă în viitor pentru a fi siguri că trigger-ul funcționează
      const triggerDate = new Date(Date.now() + 1000);
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      console.log("✅ Notificare test trimisă:", notificationId);
      return true;
    } catch (error) {
      console.error("❌ Eroare la trimitere notificare locală:", error);
      return false;
    }
  }

  /**
   * Programează notificare zilnică (daily reminder)
   */
  static async scheduleDailyReminder(
    hour: number = 9,
    minute: number = 0
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌅 Good Morning!",
          body: "Hai să vedem ce task-uri ai pentru astăzi!",
          data: { type: "daily_reminder" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      console.log("✅ Daily reminder programat:", notificationId);
      return notificationId;
    } catch (error) {
      console.error("❌ Eroare la programare daily reminder:", error);
      return null;
    }
  }

  /**
   * Obține toate notificările programate
   */
  static async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("❌ Eroare la obținere notificări programate:", error);
      return [];
    }
  }
}
