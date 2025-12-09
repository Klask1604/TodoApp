// src/contexts/NotificationsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { NotificationsService } from "../services/notifications";
import { useAuth } from "./AuthContext";
import {
  NavigationContainerRef,
  CommonActions,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

type RootTabParamList = {
  Tasks: { filter?: string };
  Home: undefined;
  Reports: undefined;
  Profile: undefined;
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList>;

interface NotificationsContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  scheduleTaskReminder: (
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    minutesBefore?: number
  ) => Promise<string | null>;
  cancelNotification: (notificationId: string) => Promise<void>;
  sendLocalNotification: (
    title: string,
    body: string,
    data?: any
  ) => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  }
  return context;
};

// Navigation ref that will be set by NavigationContainer
export const navigationRef =
  React.createRef<NavigationContainerRef<RootTabParamList>>();

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Înregistrare push notifications când utilizatorul se autentifică
  useEffect(() => {
    if (!user) {
      setExpoPushToken(null);
      setIsRegistered(false);
      return;
    }

    const registerPushNotifications = async () => {
      try {
        const token = await NotificationsService.registerForPushNotifications();
        if (token) {
          setExpoPushToken(token);
          await NotificationsService.savePushToken(user.id, token);
          setIsRegistered(true);
          console.log("✅ Push notifications înregistrate cu succes");
        }
      } catch (error) {
        console.error("❌ Eroare la înregistrare push notifications:", error);
      }
    };

    registerPushNotifications();

    // Cleanup la logout
    return () => {
      if (user) {
        NotificationsService.deletePushToken(user.id);
      }
    };
  }, [user?.id]);

  // Listener-e pentru notificări
  useEffect(() => {
    // Listener pentru notificări primite când app-ul este în foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📬 Notificare primită:", notification);
        setNotification(notification);
      });

    // Listener pentru când utilizatorul interacționează cu notificarea
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Utilizatorul a dat tap pe notificare:", response);

        const data = response.notification.request.content.data;

        // Navigare bazată pe tipul notificării
        // Folosim navigationRef pentru a accesa navigation-ul în siguranță
        if (navigationRef.current) {
          if (data?.type === "task_reminder" && data?.taskId) {
            // Navighează la Tasks screen
            navigationRef.current.navigate("Tasks", { filter: "all" });
          } else if (data?.type === "daily_reminder") {
            navigationRef.current.navigate("Tasks", { filter: "today" });
          }
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Wrapper functions pentru serviciu
  const scheduleTaskReminder = async (
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    minutesBefore: number = 60
  ) => {
    return NotificationsService.scheduleTaskNotification(
      taskId,
      taskTitle,
      dueDate,
      minutesBefore
    );
  };

  const cancelNotification = async (notificationId: string) => {
    return NotificationsService.cancelNotification(notificationId);
  };

  const sendLocalNotification = async (
    title: string,
    body: string,
    data?: any
  ) => {
    return NotificationsService.sendLocalNotification(title, body, data);
  };

  const value = {
    expoPushToken,
    notification,
    isRegistered,
    scheduleTaskReminder,
    cancelNotification,
    sendLocalNotification,
  };

  return (
    <NotificationsContext.Provider
      value={value as unknown as NotificationsContextType}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
