// src/components/TaskDialog.tsx - UPDATED with Notifications
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { TextInput, Button, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "../contexts/DataContext";
import { useNotifications } from "../contexts/NotificationsContext"; // 🆕 ADĂUGAT
import { NotificationsService } from "../services/notifications";
import { Task, TaskStatus } from "../types";

interface TaskDialogProps {
  visible: boolean;
  onDismiss: () => void;
  task?: Task | null;
}

export const TaskDialog: React.FC<TaskDialogProps> = ({
  visible,
  onDismiss,
  task,
}) => {
  const { categories, addTask, updateTask } = useData();
  const { scheduleTaskReminder, cancelNotification, isRegistered } =
    useNotifications(); // 🆕 ADĂUGAT
  const insets = useSafeAreaInsets(); // Pentru a evita suprapunerea cu bara de navigare

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedCategoryColor, setSelectedCategoryColor] = useState("#3b82f6");
  const [status, setStatus] = useState<TaskStatus>("upcoming");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🆕 State pentru notificări
  const [enableNotification, setEnableNotification] = useState(true);
  const [notificationMinutesBefore, setNotificationMinutesBefore] =
    useState(60); // 1 oră înainte

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setCategoryId(task.category_id);
      const category = categories.find((c) => c.id === task.category_id);
      setSelectedCategoryColor(category?.color || "#3b82f6");
      setStatus(task.status || "upcoming");
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      // 🆕 Încarcă setările de notificare salvate
      setEnableNotification(task.enable_notification ?? true);
      setNotificationMinutesBefore(task.notification_minutes_before ?? 60);
    } else {
      const defaultCategory = categories.find((c) => c.is_default);
      if (defaultCategory) {
        setCategoryId(defaultCategory.id);
        setSelectedCategoryColor(defaultCategory.color);
      }
      resetForm();
    }
  }, [task, visible]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("upcoming");
    setDueDate(undefined);
    setEnableNotification(true);
    setNotificationMinutesBefore(60);
    const defaultCategory = categories.find((c) => c.is_default);
    if (defaultCategory) {
      setCategoryId(defaultCategory.id);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !categoryId) return;

    try {
      setLoading(true);

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        status,
        due_date: dueDate?.toISOString(),
        // 🆕 Salvează setările de notificare
        enable_notification: enableNotification,
        notification_minutes_before: enableNotification
          ? notificationMinutesBefore
          : undefined,
      };

      let savedTaskId: string;

      if (task) {
        await updateTask(task.id, taskData);
        savedTaskId = task.id;
      } else {
        // Pentru task nou, obținem ID-ul din răspuns
        const newTask = await addTask(taskData);
        savedTaskId = newTask.id;
      }

      // 🆕 Gestionare notificări
      if (savedTaskId && isRegistered) {
        // Anulează notificările existente pentru acest task
        const scheduled =
          await NotificationsService.getScheduledNotifications();
        for (const notification of scheduled) {
          if (notification.content.data?.taskId === savedTaskId) {
            await cancelNotification(notification.identifier);
          }
        }

        // Programează notificare nouă dacă este activată și există due date
        if (enableNotification && dueDate) {
          const notificationId = await scheduleTaskReminder(
            savedTaskId,
            title.trim(),
            dueDate,
            notificationMinutesBefore
          );

          if (notificationId) {
            console.log(`✅ Notificare programată pentru task "${title}"`);
          }
        }
      }

      onDismiss();
      resetForm();
    } catch (error) {
      console.error("Error saving task:", error);
      Alert.alert("Error", "Failed to save task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && dueDate) {
      const newDate = new Date(dueDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDueDate(newDate);
    }
  };

  // 🆕 Opțiuni pentru reminder-ul de notificare
  const notificationOptions = [
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "1 oră", value: 60 },
    { label: "2 ore", value: 120 },
    { label: "1 zi", value: 1440 },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{task ? "Edit Task" : "New Task"}</Text>
            <TouchableOpacity onPress={onDismiss}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              label="Title *"
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { color: title ? "#ffffff" : undefined }]}
              mode="outlined"
              textColor="#fff"
              theme={{
                colors: {
                  primary: selectedCategoryColor,
                  text: "#ffffff",
                  placeholder: "#9ca3af",
                  onSurface: "#ffffff",
                  onSurfaceVariant: "#9ca3af",
                  outline: title
                    ? selectedCategoryColor
                    : "rgba(255, 255, 255, 0.2)",
                },
              }}
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                { color: description ? "#ffffff" : undefined },
              ]}
              mode="outlined"
              textColor="#fff"
              theme={{
                colors: {
                  primary: selectedCategoryColor,
                  text: "#ffffff",
                  placeholder: "#9ca3af",
                  onSurface: "#ffffff",
                  onSurfaceVariant: "#9ca3af",
                  outline: description
                    ? selectedCategoryColor
                    : "rgba(255, 255, 255, 0.2)",
                },
              }}
            />

            <Text style={styles.label}>Category *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsContainer}
            >
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  selected={categoryId === category.id}
                  selectedColor="#ffffff"
                  onPress={() => {
                    setCategoryId(category.id);
                    setSelectedCategoryColor(category.color);
                  }}
                  style={[
                    styles.chip,
                    categoryId === category.id && {
                      backgroundColor: category.color,
                    },
                  ]}
                  textStyle={{ color: "#fff" }}
                >
                  {category.name}
                </Chip>
              ))}
            </ScrollView>

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              {[
                { value: "upcoming", label: "To Do" },
                { value: "completed", label: "Completed" },
                { value: "canceled", label: "Canceled" },
              ].map((s) => (
                <Chip
                  key={s.value}
                  selected={status === s.value}
                  selectedColor="#ffffff"
                  onPress={() => setStatus(s.value as TaskStatus)}
                  style={[
                    styles.chip,
                    status === s.value && {
                      backgroundColor: selectedCategoryColor,
                    },
                  ]}
                  textStyle={{ color: "#fff" }}
                >
                  {s.label}
                </Chip>
              ))}
            </View>

            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={selectedCategoryColor}
              />
              <Text style={styles.dateText}>
                {dueDate
                  ? format(dueDate, "MMM dd, yyyy HH:mm")
                  : "Pick a date"}
              </Text>
            </TouchableOpacity>

            {dueDate && (
              <Button
                mode="text"
                onPress={() => setDueDate(undefined)}
                style={styles.clearButton}
              >
                Clear date
              </Button>
            )}

            {/* 🆕 Secțiune notificări */}
            {dueDate && isRegistered && (
              <View style={styles.notificationSection}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationTitleRow}>
                    <Ionicons
                      name="notifications"
                      size={20}
                      color={
                        enableNotification ? selectedCategoryColor : "#6b7280"
                      }
                    />
                    <Text style={styles.notificationTitle}>
                      Reminder Notification
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEnableNotification(!enableNotification)}
                  >
                    <Ionicons
                      name={enableNotification ? "toggle" : "toggle-outline"}
                      size={32}
                      color={
                        enableNotification ? selectedCategoryColor : "#6b7280"
                      }
                    />
                  </TouchableOpacity>
                </View>

                {enableNotification && (
                  <>
                    <Text style={styles.notificationSubtitle}>
                      Notify me before:
                    </Text>
                    <View style={styles.notificationOptions}>
                      {notificationOptions.map((option) => (
                        <Chip
                          key={option.value}
                          selected={notificationMinutesBefore === option.value}
                          selectedColor="#ffffff"
                          onPress={() =>
                            setNotificationMinutesBefore(option.value)
                          }
                          style={[
                            styles.chip,
                            notificationMinutesBefore === option.value && {
                              backgroundColor: selectedCategoryColor,
                            },
                          ]}
                          textStyle={{ color: "#fff" }}
                        >
                          {option.label}
                        </Chip>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* 🆕 Avertisment dacă notificările nu sunt activate */}
            {dueDate && !isRegistered && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Enable notifications in settings to get reminders
                </Text>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <Button
              mode="outlined"
              onPress={onDismiss}
              textColor={selectedCategoryColor}
              style={[
                {
                  borderColor: selectedCategoryColor,
                  flex: 1,
                },
              ]}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={loading || !title.trim() || !categoryId}
              style={styles.submitButton}
              buttonColor={selectedCategoryColor}
            >
              {loading ? "Saving..." : task ? "Save Changes" : "Create Task"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  label: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
    fontWeight: "500",
  },
  chipsContainer: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 8,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#fff",
  },
  clearButton: {
    marginBottom: 16,
  },
  // 🆕 Styles pentru secțiunea de notificări
  notificationSection: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  notificationSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 8,
  },
  notificationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#f59e0b",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

/* 
NOTĂ IMPORTANTĂ:
Pentru ca notificările să funcționeze corect cu task-uri noi, 
trebuie să modifici funcția addTask din DataContext să returneze task-ul creat:

const addTask = async (task: ...) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: user.id, order_index: tasks.length })
    .select()
    .single();  // ← adaugă .select().single()
    
  if (error) throw error;
  await refreshData();
  return data;  // ← returnează task-ul creat
};
*/
