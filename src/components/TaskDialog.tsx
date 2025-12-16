// src/components/TaskDialog.tsx - FINAL with Persistent Notification Preferences
import React, { useState, useEffect, useMemo } from "react";
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
import { format, parseISO, differenceInMinutes } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "../contexts/DataContext";
import { useNotifications } from "../contexts/NotificationsContext";
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
  const { scheduleTaskReminder, isRegistered } = useNotifications();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 16);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedCategoryColor, setSelectedCategoryColor] = useState("#3b82f6");
  const [status, setStatus] = useState<TaskStatus>("upcoming");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  // State temporar pentru iOS picker (permite editare fără blocare)
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // 🆕 Notification preferences - vor fi salvate în DB
  const [enableNotification, setEnableNotification] = useState(true);
  const [notificationMinutesBefore, setNotificationMinutesBefore] =
    useState(60);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setCategoryId(task.category_id);
      const category = categories.find((c) => c.id === task.category_id);
      setSelectedCategoryColor(category?.color || "#3b82f6");
      setStatus(task.status || "upcoming");
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);

      // 🆕 Load saved notification preferences
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
  }, [task, visible, categories]);

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

  // Calculează cât timp mai e până la due date
  const minutesUntilDue = useMemo(() => {
    if (!dueDate) return null;
    return differenceInMinutes(dueDate, new Date());
  }, [dueDate]);

  // Generează opțiuni valide de notificare bazat pe timp rămas
  const validNotificationOptions = useMemo(() => {
    const allOptions = [
      { label: "5 min", value: 5 },
      { label: "15 min", value: 15 },
      { label: "30 min", value: 30 },
      { label: "1 oră", value: 60 },
      { label: "2 ore", value: 120 },
      { label: "1 zi", value: 1440 },
    ];

    if (!minutesUntilDue || minutesUntilDue <= 0) return allOptions;

    // Filtrează doar opțiunile care sunt mai mici decât timpul rămas
    const validOptions = allOptions.filter(
      (opt) => opt.value < minutesUntilDue
    );

    return validOptions.length > 0
      ? validOptions
      : [{ label: "1 min", value: 1 }];
  }, [minutesUntilDue]);

  // Verifică dacă notificarea selectată e validă
  const isNotificationValid = useMemo(() => {
    if (!dueDate || !minutesUntilDue) return false;
    return notificationMinutesBefore < minutesUntilDue;
  }, [dueDate, minutesUntilDue, notificationMinutesBefore]);

  // Auto-ajustează notification time dacă devine invalid
  useEffect(() => {
    if (dueDate && minutesUntilDue !== null && minutesUntilDue > 0) {
      // Dacă notificarea selectată e prea mare, alege cea mai mare opțiune validă
      if (notificationMinutesBefore >= minutesUntilDue) {
        const maxValid =
          validNotificationOptions[validNotificationOptions.length - 1];
        if (maxValid) {
          setNotificationMinutesBefore(maxValid.value);
        }
      }
    }
  }, [dueDate, minutesUntilDue, validNotificationOptions]);

  const handleSubmit = async () => {
    if (!title.trim() || !categoryId) return;

    const isOverdue = minutesUntilDue !== null && minutesUntilDue <= 0;

    // Validare notificare (doar pentru due date viitoare)
    if (enableNotification && dueDate && !isOverdue && !isNotificationValid) {
      Alert.alert(
        "Invalid Notification",
        `Nu poți seta o notificare cu ${notificationMinutesBefore} minute înainte când task-ul expiră în doar ${minutesUntilDue} minute.\n\nAlege o valoare mai mică sau schimbă due date-ul.`,
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setLoading(true);

      // 🆕 Include notification preferences în taskData
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        status,
        due_date: dueDate?.toISOString(),
        enable_notification: enableNotification && !isOverdue,
        notification_minutes_before:
          enableNotification && !isOverdue ? notificationMinutesBefore : null,
      };

      let savedTask: Task;

      if (task) {
        await updateTask(task.id, taskData as Partial<Task>);
        savedTask = { ...task, ...taskData } as Task;
      } else {
        savedTask = await addTask(
          taskData as Omit<
            Task,
            "id" | "user_id" | "created_at" | "updated_at" | "order_index"
          >
        );
      }

      // Programează notificare dacă este activată și validă (doar pentru due date viitoare)
      if (
        enableNotification &&
        dueDate &&
        isRegistered &&
        savedTask.id &&
        isNotificationValid &&
        minutesUntilDue !== null &&
        minutesUntilDue > 0
      ) {
        const notificationId = await scheduleTaskReminder(
          savedTask.id,
          title.trim(),
          dueDate,
          notificationMinutesBefore
        );

        if (notificationId) {
          console.log(
            `✅ Notificare programată: ${notificationMinutesBefore} min înainte`
          );
        } else {
          console.log(`⚠️ Notificarea nu a fost programată`);
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
    const isAndroid = Platform.OS === "android";

    if (isAndroid) {
      if (event.type === "dismissed") {
        setShowDatePicker(false);
        return;
      }
      if (selectedDate) {
        setDueDate(selectedDate);
        setShowDatePicker(false);
        setShowTimePicker(true);
      }
    } else {
      // Pe iOS, actualizăm doar tempDate pentru a permite editare continuă
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    const isAndroid = Platform.OS === "android";

    if (isAndroid) {
      if (event.type === "dismissed") {
        setShowTimePicker(false);
        return;
      }
      if (selectedTime && dueDate) {
        const newDate = new Date(dueDate);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        setDueDate(newDate);
        setShowTimePicker(false);
      }
    } else {
      // Pe iOS, actualizăm doar tempDate pentru a permite editare continuă
      if (selectedTime) {
        const newDate = new Date(tempDate);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        setTempDate(newDate);
      }
    }
  };

  // Funcții pentru confirmare/anulare pe iOS
  const handleConfirmDate = () => {
    const confirmedDate = new Date(tempDate);
    setDueDate(confirmedDate);
    // Inițializează tempDate cu data confirmată pentru time picker
    setTempDate(confirmedDate);
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const handleConfirmTime = () => {
    const finalDate = new Date(tempDate);
    setDueDate(finalDate);
    setShowTimePicker(false);
  };

  const handleCancelPicker = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
    // Restore tempDate la dueDate existent sau data curentă
    setTempDate(dueDate || new Date());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { paddingBottom: bottomInset }]}>
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
              onPress={() => {
                // Inițializează tempDate cu dueDate existent sau data curentă
                setTempDate(dueDate || new Date());
                setShowDatePicker(true);
              }}
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

            {/* Afișează timp rămas */}
            {dueDate && minutesUntilDue !== null && (
              <View style={styles.timeRemainingBox}>
                <Ionicons name="time-outline" size={16} color="#60a5fa" />
                <Text style={styles.timeRemainingText}>
                  {minutesUntilDue > 0
                    ? `Timp rămas: ${
                        minutesUntilDue < 60
                          ? `${minutesUntilDue} minute`
                          : `${Math.floor(minutesUntilDue / 60)}h ${
                              minutesUntilDue % 60
                            }min`
                      }`
                    : "⚠️ Task-ul a expirat deja!"}
                </Text>
              </View>
            )}

            {dueDate && (
              <Button
                mode="text"
                onPress={() => setDueDate(undefined)}
                style={styles.clearButton}
              >
                Clear date
              </Button>
            )}

            {/* Secțiune notificări */}
            {dueDate &&
              isRegistered &&
              minutesUntilDue &&
              minutesUntilDue > 1 && (
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
                        {validNotificationOptions.map((option) => (
                          <Chip
                            key={option.value}
                            selected={
                              notificationMinutesBefore === option.value
                            }
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

                      {/* Warning dacă notificarea e invalidă */}
                      {!isNotificationValid && (
                        <View style={styles.invalidNotificationBox}>
                          <Ionicons name="warning" size={16} color="#ef4444" />
                          <Text style={styles.invalidNotificationText}>
                            Notificarea ar fi în trecut! Task-ul expiră prea
                            curând.
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

            {dueDate && !isRegistered && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Enable notifications in settings to get reminders
                </Text>
              </View>
            )}

            {/* Date Picker - Modal dedicat pentru iOS */}
            {showDatePicker && (
              <>
                {Platform.OS === "ios" ? (
                  <Modal
                    visible={showDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={handleCancelPicker}
                  >
                    <View style={styles.pickerModalOverlay}>
                      <View style={styles.pickerModalContainer}>
                        <View style={styles.pickerModalHeader}>
                          <TouchableOpacity onPress={handleCancelPicker}>
                            <Text style={styles.pickerModalButton}>Cancel</Text>
                          </TouchableOpacity>
                          <Text style={styles.pickerModalTitle}>
                            Select Date
                          </Text>
                          <TouchableOpacity onPress={handleConfirmDate}>
                            <Text
                              style={[
                                styles.pickerModalButton,
                                styles.pickerModalButtonConfirm,
                              ]}
                            >
                              Done
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                          <DateTimePicker
                            value={tempDate}
                            mode="date"
                            display="spinner"
                            onChange={handleDateChange}
                            minimumDate={new Date()}
                            textColor="#ffffff"
                            themeVariant="dark"
                            style={styles.dateTimePickerIOS}
                          />
                        </View>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={dueDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}

            {/* Time Picker - Modal dedicat pentru iOS */}
            {showTimePicker && (
              <>
                {Platform.OS === "ios" ? (
                  <Modal
                    visible={showTimePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={handleCancelPicker}
                  >
                    <View style={styles.pickerModalOverlay}>
                      <View style={styles.pickerModalContainer}>
                        <View style={styles.pickerModalHeader}>
                          <TouchableOpacity onPress={handleCancelPicker}>
                            <Text style={styles.pickerModalButton}>Cancel</Text>
                          </TouchableOpacity>
                          <Text style={styles.pickerModalTitle}>
                            Select Time
                          </Text>
                          <TouchableOpacity onPress={handleConfirmTime}>
                            <Text
                              style={[
                                styles.pickerModalButton,
                                styles.pickerModalButtonConfirm,
                              ]}
                            >
                              Done
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.pickerContent}>
                          <DateTimePicker
                            value={tempDate}
                            mode="time"
                            display="spinner"
                            onChange={handleTimeChange}
                            textColor="#ffffff"
                            themeVariant="dark"
                            style={styles.dateTimePickerIOS}
                          />
                        </View>
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={dueDate || new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(bottomInset, 20) },
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
  timeRemainingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 6,
  },
  timeRemainingText: {
    fontSize: 13,
    color: "#60a5fa",
  },
  clearButton: {
    marginBottom: 16,
  },
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
  invalidNotificationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  invalidNotificationText: {
    flex: 1,
    fontSize: 12,
    color: "#ef4444",
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
  submitButton: {
    flex: 1,
  },
  // Stiluri pentru iOS Date/Time Picker Modal
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModalContainer: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  pickerModalButton: {
    fontSize: 16,
    color: "#9ca3af",
    fontWeight: "500",
  },
  pickerModalButtonConfirm: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  pickerContent: {
    backgroundColor: "#0f172a",
    paddingVertical: 20,
  },
  dateTimePickerIOS: {
    backgroundColor: "#0f172a",
    height: 200,
  },
});
