import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import {
  isToday,
  isThisWeek,
  isThisMonth,
  parseISO,
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from 'date-fns';

const { width } = Dimensions.get('window');

export const ReportsScreen = () => {
  const { tasks, categories } = useData();

  // Overall stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    active: tasks.filter(
      (t) => t.status === 'upcoming' || t.status === 'overdue'
    ).length,
    completedToday: tasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.updated_at &&
        isToday(parseISO(t.updated_at))
    ).length,
    completedThisWeek: tasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.updated_at &&
        isThisWeek(parseISO(t.updated_at))
    ).length,
    completedThisMonth: tasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.updated_at &&
        isThisMonth(parseISO(t.updated_at))
    ).length,
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Category stats
  const categoryStats = categories
    .map((cat) => {
      const categoryTasks = tasks.filter((t) => t.category_id === cat.id);
      const completed = categoryTasks.filter(
        (t) => t.status === 'completed'
      ).length;
      const rate =
        categoryTasks.length > 0
          ? Math.round((completed / categoryTasks.length) * 100)
          : 0;

      return {
        ...cat,
        total: categoryTasks.length,
        completed,
        completionRate: rate,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Weekly activity
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyActivity = daysOfWeek.map((day) => {
    const completed = tasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.updated_at &&
        format(parseISO(t.updated_at), 'yyyy-MM-dd') ===
          format(day, 'yyyy-MM-dd')
    ).length;

    return {
      day: format(day, 'EEE'),
      completed,
      isToday: isToday(day),
    };
  });

  const maxCompleted = Math.max(...weeklyActivity.map((d) => d.completed), 1);

  const overviewCards = [
    {
      title: 'Total Tasks',
      value: stats.total,
      icon: 'albums',
      colors: ['#2563eb', '#1e40af'],
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: 'checkmark-circle',
      colors: ['#059669', '#047857'],
    },
    {
      title: 'Active Tasks',
      value: stats.active,
      icon: 'time',
      colors: ['#f59e0b', '#d97706'],
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: 'trending-up',
      colors: ['#7c3aed', '#6d28d9'],
    },
  ];

  const milestones = [
    {
      title: "Today's Progress",
      value: stats.completedToday,
      icon: 'trophy',
      colors: ['#eab308', '#ca8a04'],
    },
    {
      title: 'This Week',
      value: stats.completedThisWeek,
      icon: 'calendar',
      colors: ['#3b82f6', '#2563eb'],
    },
    {
      title: 'This Month',
      value: stats.completedThisMonth,
      icon: 'stats-chart',
      colors: ['#a855f7', '#9333ea'],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics 📊</Text>
        <Text style={styles.subtitle}>
          Track your productivity and task completion trends
        </Text>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewContainer}>
        {overviewCards.map((card, index) => (
          <View key={index} style={styles.overviewCard}>
            <LinearGradient
              colors={card.colors}
              style={styles.overviewGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={card.icon as any} size={24} color="#fff" />
              <Text style={styles.overviewLabel}>{card.title}</Text>
              <Text style={styles.overviewValue}>{card.value}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* Weekly Activity */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>This Week's Activity</Text>
          </View>

          {weeklyActivity.map((day, index) => (
            <View key={index} style={styles.activityItem}>
              <Text
                style={[
                  styles.activityDay,
                  day.isToday && styles.activityDayToday,
                ]}
              >
                {day.day}
              </Text>
              <View style={styles.activityBarContainer}>
                <View
                  style={[
                    styles.activityBar,
                    {
                      width: `${(day.completed / maxCompleted) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.activityCount}>{day.completed}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Milestones */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Ionicons name="trophy" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Milestones</Text>
          </View>

          {milestones.map((milestone, index) => (
            <View key={index} style={styles.milestoneItem}>
              <LinearGradient
                colors={milestone.colors}
                style={styles.milestoneGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.milestoneIcon}>
                  <Ionicons
                    name={milestone.icon as any}
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  <Text style={styles.milestoneValue}>
                    {milestone.value} tasks completed
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Category Performance */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Ionicons name="pricetag" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Category Performance</Text>
          </View>

          {categoryStats.length === 0 ? (
            <Text style={styles.emptyText}>No categories yet</Text>
          ) : (
            categoryStats.map((category) => (
              <View key={category.id} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: category.color },
                      ]}
                    />
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryCount}>
                      {category.completed}/{category.total}
                    </Text>
                    <Text style={styles.categoryRate}>
                      {category.completionRate}%
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${category.completionRate}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  overviewCard: {
    width: (width - 60) / 2,
    height: 120,
    margin: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  overviewGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  overviewLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityDay: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    width: 40,
  },
  activityDayToday: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  activityBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  activityBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  activityCount: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  milestoneItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  milestoneGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneContent: {
    marginLeft: 12,
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  milestoneValue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  categoryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  categoryRate: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 20,
  },
});
