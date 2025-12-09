import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Checkbox } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Task, Category } from "../types";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { useData } from "../contexts/DataContext";

interface TaskCardProps {
  task: Task;
  category?: Category;
  onPress: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  category,
  onPress,
}) => {
  const { updateTask, deleteTask } = useData();

  const handleStatusChange = async () => {
    await updateTask(task.id, {
      status: task.status === "completed" ? "upcoming" : "completed",
    });
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
  };

  const isCompleted = task.status === "completed";
  const isCanceled = task.status === "canceled";

  const getStatusBadge = () => {
    if (isCompleted) return null;

    if (isCanceled) {
      return { text: "CANCELED", color: "#6b7280" };
    }

    if (task.due_date) {
      const dueDate = parseISO(task.due_date);
      if (isPast(dueDate) && !isToday(dueDate) && task.status === "upcoming") {
        return { text: "OVERDUE", color: "#ef4444" };
      }
    }

    return { text: "UPCOMING", color: "#3b82f6" };
  };

  const getDateBadge = () => {
    if (!task.due_date || isCompleted || isCanceled) return null;

    const dueDate = parseISO(task.due_date);
    if (isToday(dueDate)) {
      return { text: "Today", color: "#22c55e" };
    }
    if (isTomorrow(dueDate)) {
      return { text: "Tomorrow", color: "#3b82f6" };
    }
    return { text: format(dueDate, "MMM dd"), color: "#6b7280" };
  };

  const statusBadge = getStatusBadge();
  const dateBadge = getDateBadge();

  return (
    <View
      style={[
        styles.container,
        (isCompleted || isCanceled) && styles.containerDimmed,
      ]}
    >
      <Checkbox
        status={isCompleted ? "checked" : "unchecked"}
        onPress={handleStatusChange}
        disabled={isCanceled}
        color="#22c55e"
      />

      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.mainContent}>
          <Text
            style={[
              styles.title,
              (isCompleted || isCanceled) && styles.titleCompleted,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <View style={styles.badges}>
            {statusBadge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${statusBadge.color}20` },
                ]}
              >
                <Text style={[styles.badgeText, { color: statusBadge.color }]}>
                  {statusBadge.text}
                </Text>
              </View>
            )}

            {dateBadge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${dateBadge.color}20` },
                ]}
              >
                <Text style={[styles.badgeText, { color: dateBadge.color }]}>
                  {dateBadge.text}
                </Text>
              </View>
            )}

            {category && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${category.color}30` },
                ]}
              >
                <Text style={[styles.badgeText, { color: category.color }]}>
                  {category.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onPress} style={styles.actionButton}>
            <Ionicons name="pencil" size={18} color="#60a5fa" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Ionicons name="trash" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  containerDimmed: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  mainContent: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
    fontWeight: "500",
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: "#6b7280",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});
