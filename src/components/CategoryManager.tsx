import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useData } from "../contexts/DataContext";
import { Category } from "../types";

interface CategoryManagerProps {
  visible: boolean;
  onDismiss: () => void;
}

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  visible,
  onDismiss,
}) => {
  const { categories, addCategory, deleteCategory, updateCategory } = useData();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const resetNew = () => {
    setName("");
    setSelectedColor(COLORS[0]);
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      await addCategory(name.trim(), selectedColor);
      resetNew();
    } catch (error) {
      console.error("Error adding category:", error);
      Alert.alert("Error", "Failed to add category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (category: Category) => {
    Alert.alert(
      "Delete category",
      `Are you sure you want to delete "${category.name}"?\nTasks will be moved to the default category.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(category.id),
        },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await deleteCategory(id);
    } catch (error: any) {
      console.error("Error deleting category:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to delete category. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setLoading(true);
      await updateCategory(id, {
        name: editName.trim(),
        color: editColor,
      });
      cancelEdit();
    } catch (error) {
      console.error("Error updating category:", error);
      Alert.alert("Error", "Failed to update category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Categories</Text>
            <TouchableOpacity onPress={onDismiss}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>New Category</Text>
            <View style={styles.newRow}>
              <TextInput
                label="Category name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                mode="outlined"
                theme={{ colors: { primary: selectedColor } }}
                disabled={loading}
              />
              <Button
                mode="contained"
                onPress={handleAdd}
                disabled={loading || !name.trim()}
                buttonColor={selectedColor}
                style={styles.addButton}
              >
                Add
              </Button>
            </View>

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorsRow}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: color,
                      borderColor:
                        selectedColor === color ? "#fff" : "transparent",
                    },
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Your Categories</Text>
            {categories.length === 0 ? (
              <Text style={styles.emptyText}>No categories yet</Text>
            ) : (
              categories.map((category) => (
                <View key={category.id} style={styles.categoryRow}>
                  {editingId === category.id ? (
                    <>
                      <View style={styles.editLeft}>
                        <View style={styles.editColorsRow}>
                          {COLORS.map((color) => (
                            <TouchableOpacity
                              key={color}
                              style={[
                                styles.editColorDot,
                                {
                                  backgroundColor: color,
                                  borderColor:
                                    editColor === color
                                      ? "#fff"
                                      : "rgba(148, 163, 184, 0.6)",
                                },
                              ]}
                              onPress={() => setEditColor(color)}
                            />
                          ))}
                        </View>
                        <TextInput
                          value={editName}
                          onChangeText={setEditName}
                          style={styles.editInput}
                          mode="outlined"
                          disabled={loading}
                        />
                      </View>
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleUpdate(category.id)}
                          disabled={loading || !editName.trim()}
                          style={styles.iconButton}
                        >
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color="#22c55e"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={cancelEdit}
                          disabled={loading}
                          style={styles.iconButton}
                        >
                          <Ionicons name="close" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.categoryInfo}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: category.color },
                          ]}
                        />
                        <Text style={styles.categoryName}>{category.name}</Text>
                        {category.is_default && (
                          <Text style={styles.defaultBadge}>Default</Text>
                        )}
                      </View>
                      {!category.is_default && (
                        <View style={styles.actions}>
                          <TouchableOpacity
                            onPress={() => startEdit(category)}
                            disabled={loading}
                            style={styles.iconButton}
                          >
                            <Ionicons name="pencil" size={18} color="#60a5fa" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmDelete(category)}
                            disabled={loading}
                            style={styles.iconButton}
                          >
                            <Ionicons name="trash" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "rgb(28, 36, 50)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.3)",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f9fafb",
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f9fafb",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#e5e7eb",
    marginTop: 4,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "rgba(15,23,42,0.95)",
  },
  newRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  addButton: {
    marginLeft: 4,
  },
  colorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.5)",
    marginVertical: 16,
  },
  emptyText: {
    color: "#e5e7eb",
    fontSize: 13,
    fontStyle: "italic",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryName: {
    color: "#f9fafb",
    fontSize: 14,
    flexShrink: 1,
  },
  defaultBadge: {
    marginLeft: 6,
    fontSize: 10,
    color: "#e5e7eb",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  iconButton: {
    padding: 6,
  },
  editLeft: {
    flex: 1,
    marginRight: 8,
  },
  editColorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  editColorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  editInput: {
    backgroundColor: "rgba(15,23,42,0.9)",
  },
});
