import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { FAB } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useData } from "../contexts/DataContext";
import { TaskCard } from "../components/TaskCard";
import { TaskDialog } from "../components/TaskDialog";
import { Task } from "../types";
import {
  isToday,
  isPast,
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { CategoryManager } from "../components/CategoryManager";

interface TasksScreenProps {
  route?: any;
}

type ViewMode = "list" | "week" | "kanban" | "month";

export const TasksScreen: React.FC<TasksScreenProps> = ({ route }) => {
  const { tasks, categories } = useData();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [taskDialogVisible, setTaskDialogVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [categoryManagerVisible, setCategoryManagerVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayTasksModalVisible, setDayTasksModalVisible] = useState(false);
  const [kanbanFilter, setKanbanFilter] = useState<
    "all" | "upcoming" | "completed" | "canceled"
  >("all");

  useEffect(() => {
    if (route?.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route?.params?.filter]);

  const filteredTasks = (() => {
    if (selectedFilter === "completed") {
      return tasks.filter((t) => t.status === "completed");
    }
    if (selectedFilter === "canceled") {
      return tasks.filter((t) => t.status === "canceled");
    }
    if (selectedFilter === "all") {
      return tasks;
    }
    if (selectedFilter === "today") {
      return tasks.filter((t) => t.due_date && isToday(new Date(t.due_date)));
    }
    if (selectedFilter === "overdue") {
      return tasks.filter(
        (t) =>
          t.status === "upcoming" &&
          t.due_date &&
          isPast(new Date(t.due_date)) &&
          !isToday(new Date(t.due_date))
      );
    }
    return tasks.filter((t) => t.category_id === selectedFilter);
  })();

  // Calculate selectedDayTasks dynamically from tasks (after filteredTasks is defined)
  const selectedDayTasks = selectedDay
    ? filteredTasks.filter((t) => {
        if (!t.due_date) return false;
        return isSameDay(parseISO(t.due_date), selectedDay);
      })
    : [];

  const getTitle = () => {
    if (selectedFilter === "all") return "All Tasks";
    if (selectedFilter === "today") return "Today";
    if (selectedFilter === "completed") return "Completed";
    if (selectedFilter === "canceled") return "Canceled";
    if (selectedFilter === "overdue") return "Overdue";
    const category = categories.find((c) => c.id === selectedFilter);
    return category?.name || "My Tasks";
  };

  const filterOptions = [
    { id: "all", label: "All Tasks", icon: "file-tray-full" },
    { id: "today", label: "Today", icon: "today" },
    { id: "overdue", label: "Overdue", icon: "time" },
    { id: "completed", label: "Completed", icon: "checkmark-circle" },
    { id: "canceled", label: "Canceled", icon: "close-circle" },
  ];

  const handleTaskPress = (task: Task) => {
    setEditingTask(task);
    setTaskDialogVisible(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskDialogVisible(true);
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TaskCard
      task={item}
      category={categories.find((c) => c.id === item.category_id)}
      onPress={() => handleTaskPress(item)}
    />
  );

  const renderListView = () => (
    <>
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={64}
            color="rgba(255, 255, 255, 0.3)"
          />
          <Text style={styles.emptyText}>No tasks yet</Text>
          <Text style={styles.emptySubtext}>
            Create your first task to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  const renderWeekView = () => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

    return (
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() =>
              setCurrentWeekStart(
                startOfWeek(
                  new Date(
                    currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000
                  ),
                  { weekStartsOn: 1 }
                )
              )
            }
          >
            <Ionicons name="chevron-back" size={18} color="#e5e7eb" />
          </TouchableOpacity>
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekNavTitle}>
              {format(currentWeekStart, "MMMM yyyy")}
            </Text>
            <Text style={styles.weekNavSubtitle}>
              {format(currentWeekStart, "dd MMM")} - {format(weekEnd, "dd MMM")}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() =>
              setCurrentWeekStart(
                startOfWeek(
                  new Date(
                    currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000
                  ),
                  { weekStartsOn: 1 }
                )
              )
            }
          >
            <Ionicons name="chevron-forward" size={18} color="#e5e7eb" />
          </TouchableOpacity>
        </View>

        {days.map((day) => {
          const dayTasks = filteredTasks.filter(
            (t) => t.due_date && isSameDay(parseISO(t.due_date), day)
          );
          if (dayTasks.length === 0) return null;
          return (
            <View key={day.toISOString()} style={styles.weekSection}>
              <Text
                style={[
                  styles.weekSectionTitle,
                  isToday(day) && styles.weekSectionTitleToday,
                ]}
              >
                {format(day, "EEEE, MMM dd")}
              </Text>
              {dayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  category={categories.find((c) => c.id === task.category_id)}
                  onPress={() => handleTaskPress(task)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderKanbanView = () => {
    const upcoming = filteredTasks.filter((t) => t.status === "upcoming");
    const completed = filteredTasks.filter((t) => t.status === "completed");
    const canceled = filteredTasks.filter((t) => t.status === "canceled");

    // Filter tasks based on kanban filter
    let displayUpcoming = upcoming;
    let displayCompleted = completed;
    let displayCanceled = canceled;

    if (kanbanFilter === "upcoming") {
      displayCompleted = [];
      displayCanceled = [];
    } else if (kanbanFilter === "completed") {
      displayUpcoming = [];
      displayCanceled = [];
    } else if (kanbanFilter === "canceled") {
      displayUpcoming = [];
      displayCompleted = [];
    }

    const renderColumn = (title: string, data: Task[]) => (
      <View style={styles.kanbanColumn}>
        <Text style={styles.kanbanColumnTitle}>{title}</Text>
        {data.length === 0 ? (
          <Text style={styles.kanbanEmpty}>No tasks</Text>
        ) : (
          data.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              category={categories.find((c) => c.id === task.category_id)}
              onPress={() => handleTaskPress(task)}
            />
          ))
        )}
      </View>
    );

    return (
      <ScrollView contentContainerStyle={styles.kanbanContainer}>
        {renderColumn("To Do", displayUpcoming)}
        {renderColumn("Completed", displayCompleted)}
        {renderColumn("Canceled", displayCanceled)}
      </ScrollView>
    );
  };

  const renderMonthView = (): React.ReactElement => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Extindem la începutul și sfârșitul săptămânii, ca în calendar clasic
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const tasksByDay: { [key: string]: Task[] } = {};
    filteredTasks.forEach((t) => {
      if (!t.due_date) return;
      const key = format(new Date(t.due_date), "yyyy-MM-dd");
      if (!tasksByDay[key]) tasksByDay[key] = [];
      tasksByDay[key].push(t);
    });

    return (
      <ScrollView contentContainerStyle={styles.monthContainer}>
        {/* Header zile săptămână */}
        <View style={styles.monthWeekHeader}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <Text key={d} style={styles.monthWeekHeaderText}>
              {d}
            </Text>
          ))}
        </View>

        {/* Grid zile */}
        <View style={styles.monthGrid}>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay[key] || [];
            const inCurrentMonth = isSameMonth(day, monthStart);
            const isTodayFlag = isToday(day);

            return (
              <TouchableOpacity
                key={key}
                style={styles.monthCell}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedDay(day);
                  if (dayTasks.length > 0) {
                    setDayTasksModalVisible(true);
                  }
                }}
              >
                <View
                  style={[
                    styles.monthDayCircle,
                    isTodayFlag && styles.monthDayCircleToday,
                    !inCurrentMonth && styles.monthDayCircleOutside,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthDayText,
                      !inCurrentMonth && styles.monthDayTextOutside,
                    ]}
                  >
                    {format(day, "d")}
                  </Text>
                </View>

                {/* puncte / mini-badge-uri pt task-uri */}
                {dayTasks.slice(0, 3).map((task) => (
                  <View key={task.id} style={styles.monthDot}>
                    <View
                      style={[
                        styles.monthDotInner,
                        {
                          backgroundColor:
                            categories.find((c) => c.id === task.category_id)
                              ?.color || "#3b82f6",
                        },
                      ]}
                    />
                  </View>
                ))}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getTitle()}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setCategoryManagerVisible(true)}
            style={styles.headerIconButton}
          >
            <Ionicons name="pricetag" size={22} color="#93c5fd" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={styles.headerIconButton}
          >
            <Ionicons name="funnel" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            viewMode === "list" && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewMode("list")}
        >
          <Ionicons
            name="list"
            size={16}
            color={viewMode === "list" ? "#0f172a" : "#e5e7eb"}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === "list" && styles.viewToggleTextActive,
            ]}
          >
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            viewMode === "week" && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewMode("week")}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={viewMode === "week" ? "#0f172a" : "#e5e7eb"}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === "week" && styles.viewToggleTextActive,
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            viewMode === "kanban" && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewMode("kanban")}
        >
          <Ionicons
            name="grid-outline"
            size={16}
            color={viewMode === "kanban" ? "#0f172a" : "#e5e7eb"}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === "kanban" && styles.viewToggleTextActive,
            ]}
          >
            Kanban
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            viewMode === "month" && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewMode("month")}
        >
          <Ionicons
            name="calendar"
            size={16}
            color={viewMode === "month" ? "#0f172a" : "#e5e7eb"}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === "month" && styles.viewToggleTextActive,
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "kanban" && (
        <View style={styles.kanbanFilterContainer}>
          <TouchableOpacity
            style={[
              styles.kanbanFilterButton,
              kanbanFilter === "all" && styles.kanbanFilterButtonActive,
            ]}
            onPress={() => setKanbanFilter("all")}
          >
            <Text
              style={[
                styles.kanbanFilterText,
                kanbanFilter === "all" && styles.kanbanFilterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.kanbanFilterButton,
              kanbanFilter === "upcoming" && styles.kanbanFilterButtonActive,
            ]}
            onPress={() => setKanbanFilter("upcoming")}
          >
            <Text
              style={[
                styles.kanbanFilterText,
                kanbanFilter === "upcoming" && styles.kanbanFilterTextActive,
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.kanbanFilterButton,
              kanbanFilter === "completed" && styles.kanbanFilterButtonActive,
            ]}
            onPress={() => setKanbanFilter("completed")}
          >
            <Text
              style={[
                styles.kanbanFilterText,
                kanbanFilter === "completed" && styles.kanbanFilterTextActive,
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.kanbanFilterButton,
              kanbanFilter === "canceled" && styles.kanbanFilterButtonActive,
            ]}
            onPress={() => setKanbanFilter("canceled")}
          >
            <Text
              style={[
                styles.kanbanFilterText,
                kanbanFilter === "canceled" && styles.kanbanFilterTextActive,
              ]}
            >
              Canceled
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {viewMode === "list" && renderListView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "kanban" && renderKanbanView()}
      {viewMode === "month" && renderMonthView()}

      {selectedFilter !== "completed" && selectedFilter !== "canceled" && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleAddTask}
          color="#fff"
        />
      )}

      <TaskDialog
        visible={taskDialogVisible}
        onDismiss={() => {
          setTaskDialogVisible(false);
          setEditingTask(null);
        }}
        task={editingTask}
      />

      <CategoryManager
        visible={categoryManagerVisible}
        onDismiss={() => setCategoryManagerVisible(false)}
      />

      {/* Filters modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterOverlay}>
          <View style={styles.filterContainer}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.headerIconButton}
              >
                <Ionicons name="close" size={22} color="#e5e7eb" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterContent}
              contentContainerStyle={styles.filterContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.filterSectionTitle}>Quick filters</Text>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterOption,
                    selectedFilter === option.id && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedFilter(option.id);
                    setFilterModalVisible(false);
                  }}
                >
                  <View style={styles.filterOptionLeft}>
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={
                        selectedFilter === option.id ? "#0f172a" : "#e5e7eb"
                      }
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === option.id &&
                          styles.filterOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={[styles.filterSectionTitle, { marginTop: 16 }]}>
                Categories
              </Text>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterOption,
                    selectedFilter === category.id && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedFilter(category.id);
                    setFilterModalVisible(false);
                  }}
                >
                  <View style={styles.filterOptionLeft}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: category.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === category.id &&
                          styles.filterOptionTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tasks for selected day (month view) */}
      <Modal
        visible={dayTasksModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDayTasksModalVisible(false)}
      >
        <View style={styles.dayModalOverlay}>
          <View style={styles.dayModalContainer}>
            <View style={styles.dayModalHeader}>
              <Text style={styles.dayModalTitle}>
                {selectedDay ? format(selectedDay, "EEEE, MMM dd") : "Tasks"}
              </Text>
              <TouchableOpacity
                onPress={() => setDayTasksModalVisible(false)}
                style={styles.headerIconButton}
              >
                <Ionicons name="close" size={22} color="#e5e7eb" />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.dayModalContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedDayTasks.length === 0 ? (
                <Text style={styles.dayModalEmpty}>No tasks for this day</Text>
              ) : (
                selectedDayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    category={categories.find((c) => c.id === task.category_id)}
                    onPress={() => {
                      setDayTasksModalVisible(false);
                      handleTaskPress(task);
                    }}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    padding: 6,
    marginRight: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  viewToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 4,
  },
  viewToggleButtonActive: {
    backgroundColor: "#e5e7eb",
  },
  viewToggleText: {
    fontSize: 12,
    color: "#e5e7eb",
  },
  viewToggleTextActive: {
    color: "#0f172a",
    fontWeight: "600",
  },
  menu: {
    backgroundColor: "#1e293b",
  },
  menuTitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    paddingHorizontal: 16,
    paddingTop: 8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  menuItem: {
    color: "#fff",
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 8,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#3b82f6",
  },
  weekSection: {
    marginBottom: 16,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekNavButton: {
    padding: 8,
  },
  weekNavCenter: {
    alignItems: "center",
  },
  weekNavTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  weekNavSubtitle: {
    fontSize: 12,
    color: "rgba(156,163,175,1)",
  },
  weekSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(209,213,219,1)",
    marginBottom: 8,
  },
  weekSectionTitleToday: {
    color: "#60a5fa",
  },
  kanbanContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  kanbanColumn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },
  kanbanColumnTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  kanbanEmpty: {
    fontSize: 12,
    color: "rgba(148,163,184,0.9)",
  },
  monthContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  monthWeekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  monthWeekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(209,213,219,1)",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 6,
  },
  monthDayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  monthDayCircleToday: {
    backgroundColor: "#3b82f6",
  },
  monthDayCircleOutside: {
    opacity: 0.4,
  },
  monthDayText: {
    fontSize: 12,
    color: "#e5e7eb",
    fontWeight: "500",
  },
  monthDayTextOutside: {
    color: "rgba(148,163,184,0.9)",
  },
  monthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  monthDotInner: {
    flex: 1,
    borderRadius: 3,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  filterContainer: {
    backgroundColor: "#020617",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    flex: 1,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.2)",
  },
  filterContent: {
    flex: 1,
  },
  filterContentContainer: {
    padding: 20,
    paddingTop: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f9fafb",
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(156,163,175,1)",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  filterOptionActive: {
    backgroundColor: "#e5e7eb",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterOptionText: {
    fontSize: 14,
    color: "#e5e7eb",
  },
  filterOptionTextActive: {
    color: "#0f172a",
    fontWeight: "600",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  dayModalContainer: {
    backgroundColor: "#020617",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
  },
  dayModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.4)",
  },
  dayModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f9fafb",
  },
  dayModalContent: {
    padding: 20,
    paddingBottom: 28,
  },
  dayModalEmpty: {
    fontSize: 14,
    color: "rgba(156,163,175,1)",
  },
  kanbanFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  kanbanFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  kanbanFilterButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  kanbanFilterText: {
    fontSize: 12,
    color: "#e5e7eb",
    fontWeight: "500",
  },
  kanbanFilterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});
