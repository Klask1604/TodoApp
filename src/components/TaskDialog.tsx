import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { TextInput, Button, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { useData } from "../contexts/DataContext";
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedCategoryColor, setSelectedCategoryColor] = useState("#3b82f6");
  const [status, setStatus] = useState<TaskStatus>("upcoming");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setCategoryId(task.category_id);
      const category = categories.find((c) => c.id === task.category_id);
      setSelectedCategoryColor(category?.color || "#3b82f6");
      setStatus(task.status || "upcoming");
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
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
      };

      if (task) {
        await updateTask(task.id, taskData);
      } else {
        await addTask(taskData);
      }

      onDismiss();
      resetForm();
    } catch (error) {
      console.error("Error saving task:", error);
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

          <View style={styles.footer}>
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
