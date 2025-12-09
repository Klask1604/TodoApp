import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useData } from "../contexts/DataContext";
import { isToday, isTomorrow, isPast } from "date-fns";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

type RootTabParamList = {
  Tasks: { filter?: string };
  Home: undefined;
  Reports: undefined;
  Profile: undefined;
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList>;

const { width } = Dimensions.get("window");

export const HomeScreen = () => {
  const { tasks, categories } = useData();
  const navigation = useNavigation<NavigationProp>();

  const stats = {
    total: tasks.filter(
      (task) => task.status === "upcoming" || task.status === "overdue"
    ).length,
    today: tasks.filter(
      (task) =>
        (task.status === "upcoming" || task.status === "overdue") &&
        task.due_date &&
        isToday(new Date(task.due_date))
    ).length,
    overdue: tasks.filter(
      (task) =>
        task.status === "upcoming" &&
        task.due_date &&
        isPast(new Date(task.due_date)) &&
        !isToday(new Date(task.due_date))
    ).length,
    completed: tasks.filter((task) => task.status === "completed").length,
    tomorrow: tasks.filter(
      (task) =>
        (task.status === "upcoming" || task.status === "overdue") &&
        task.due_date &&
        isTomorrow(new Date(task.due_date))
    ).length,
  };

  const quickActions = [
    {
      id: "inbox",
      title: "Inbox",
      count: stats.total,
      icon: "file-tray-full",
      colors: ["#2563eb", "#1e40af"] as const,
      onPress: () => navigation.navigate("Tasks", { filter: "all" }),
    },
    {
      id: "today",
      title: "Today",
      count: stats.today,
      icon: "today",
      colors: ["#059669", "#047857"] as const,
      onPress: () => navigation.navigate("Tasks", { filter: "today" }),
    },
    {
      id: "overdue",
      title: "Overdue",
      count: stats.overdue,
      icon: "time",
      colors: ["#dc2626", "#b91c1c"] as const,
      onPress: () => navigation.navigate("Tasks", { filter: "overdue" }),
    },
    {
      id: "completed",
      title: "Completed",
      count: stats.completed,
      icon: "checkmark-circle",
      colors: ["#7c3aed", "#6d28d9"] as const,
      onPress: () => navigation.navigate("Tasks", { filter: "completed" }),
    },
  ];

  const topCategories = categories
    .map((cat) => ({
      ...cat,
      count: tasks.filter(
        (t) =>
          t.category_id === cat.id &&
          (t.status === "upcoming" || t.status === "overdue")
      ).length,
    }))
    .filter((cat) => cat.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back! 👋</Text>
        <Text style={styles.subtitle}>
          Here's what's happening with your tasks today.
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.statCard}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={action.colors}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statHeader}>
                <Ionicons name={action.icon as any} size={24} color="#fff" />
                {action.count > 0 && action.id === "today" && (
                  <View style={styles.badge} />
                )}
              </View>
              <Text style={styles.statLabel}>{action.title}</Text>
              <Text style={styles.statValue}>{action.count}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Ionicons name="pricetag" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Top Categories</Text>
            </View>

            {topCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() =>
                  navigation.navigate("Tasks", { filter: category.id })
                }
              >
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: category.color },
                    ]}
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryCount}>
                    {category.count} tasks
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="rgba(255,255,255,0.5)"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quick Tips */}
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💡 Quick Tips</Text>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>Stay Organized</Text>
            <Text style={styles.tipText}>
              Use categories to group similar tasks and keep your workflow
              clean.
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>Set Due Dates</Text>
            <Text style={styles.tipText}>
              Add due dates to tasks to never miss an important deadline.
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>Check Reports</Text>
            <Text style={styles.tipText}>
              View your productivity trends and completed tasks statistics.
            </Text>
          </View>
        </View>
      </View>

      {/* Tomorrow Preview */}
      {stats.tomorrow > 0 && (
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Coming Up Tomorrow</Text>
            </View>
            <Text style={styles.tomorrowText}>
              You have{" "}
              <Text style={styles.tomorrowCount}>{stats.tomorrow}</Text> task
              {stats.tomorrow !== 1 ? "s" : ""} scheduled for tomorrow.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Tasks", { filter: "all" })}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View all tasks →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 20 }} />
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
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
  },
  statCard: {
    width: (width - 60) / 2,
    height: 120,
    margin: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  statGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  statLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    elevation: 0,
    overflow: "hidden",
  },
  cardContent: {
    padding: 20,
    paddingVertical: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryCount: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginRight: 8,
  },
  tipItem: {
    padding: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#60a5fa",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  tomorrowText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 12,
  },
  tomorrowCount: {
    fontWeight: "bold",
    color: "#fff",
  },
  viewAllButton: {
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: "#60a5fa",
  },
});
