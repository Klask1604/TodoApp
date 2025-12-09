import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { Task, Category } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  tasks: Task[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  addTask: (
    task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'order_index'>
  ) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addCategory: (name: string, color?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  const ensureDefaultCategory = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();

      if (data) return;

      const { data: newCategory } = await supabase
        .from('categories')
        .insert({
          name: 'General',
          color: '#3b82f6',
          user_id: userId,
          is_default: true,
        })
        .select()
        .single();

      if (newCategory) {
        setCategories((prev) => [newCategory, ...prev]);
      }
    } catch (error) {
      console.error('Error in ensureDefaultCategory:', error);
    }
  };

  const loadData = async () => {
    if (!user) {
      setTasks([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      // Ensure default category
      await ensureDefaultCategory(user.id);

      // Load categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (catData) {
        setCategories(catData);
      }

      // Load tasks
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (taskData) {
        setTasks(taskData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setTasks([]);
      setCategories([]);
      setLoading(false);
    }
  }, [user?.id]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user || loading) return;

    const tasksChannel = supabase
      .channel(`tasks_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel(`categories_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      tasksChannel.unsubscribe();
      categoriesChannel.unsubscribe();
    };
  }, [user?.id, loading]);

  // Task operations
  const addTask = async (
    task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'order_index'>
  ) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        user_id: user.id,
        order_index: tasks.length,
      });

    if (error) throw error;
    await refreshData();
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  // Category operations
  const addCategory = async (name: string, color: string = '#3b82f6') => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.from('categories').insert({
      name,
      color,
      user_id: user.id,
      is_default: false,
    });

    if (error) throw error;
    await refreshData();
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { is_default, ...safeUpdates } = updates;

    const { error } = await supabase
      .from('categories')
      .update(safeUpdates)
      .eq('id', id);

    if (error) throw error;
    await refreshData();
  };

  const deleteCategory = async (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (!category) throw new Error('Category not found');
    if (category.is_default) throw new Error('Cannot delete default category');

    const defaultCategory = categories.find((c) => c.is_default);
    if (!defaultCategory) throw new Error('Default category not found');

    // Move tasks to default category
    const tasksToMove = tasks.filter((t) => t.category_id === id);
    for (const task of tasksToMove) {
      await supabase
        .from('tasks')
        .update({ category_id: defaultCategory.id })
        .eq('id', task.id);
    }

    // Delete category
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const value = {
    tasks,
    categories,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    addCategory,
    deleteCategory,
    updateCategory,
    refreshData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
