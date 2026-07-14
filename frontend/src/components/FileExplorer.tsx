import React, { useCallback, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/src/context/AppContext";
import { FileNode } from "@/src/lib/fs";
import { detectLanguage } from "@/src/lib/themes";

type PromptState =
  | { kind: "newFile"; parent: string }
  | { kind: "newFolder"; parent: string }
  | { kind: "rename"; oldPath: string; oldName: string; isDir: boolean }
  | { kind: "delete"; path: string; name: string; isDir: boolean }
  | null;

export default function FileExplorer() {
  const {
    isExplorerOpen,
    setExplorerOpen,
    tree,
    openFile,
    createNewFile,
    createNewFolder,
    renameFileOrFolder,
    removeEntry,
    theme,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptValue, setPromptValue] = useState("");

  const toggleFolder = (p: string) =>
    setExpanded((prev) => ({ ...prev, [p]: !prev[p] }));

  const handleOpen = async (node: FileNode) => {
    if (node.isDirectory) {
      toggleFolder(node.path);
    } else {
      await openFile(node.path);
      setExplorerOpen(false);
    }
  };

  const startPrompt = (p: NonNullable<PromptState>, defaultValue = "") => {
    setPrompt(p);
    setPromptValue(defaultValue);
  };

  const confirmPrompt = useCallback(async () => {
    if (!prompt) return;
    const val = promptValue.trim();
    if (prompt.kind === "delete") {
      await removeEntry(prompt.path, prompt.isDir);
      setPrompt(null);
      return;
    }
    if (!val) return;
    try {
      if (prompt.kind === "newFile") {
        const path = prompt.parent ? `${prompt.parent}/${val}` : val;
        await createNewFile(path, "");
        await openFile(path);
        setExplorerOpen(false);
      } else if (prompt.kind === "newFolder") {
        const path = prompt.parent ? `${prompt.parent}/${val}` : val;
        await createNewFolder(path);
        setExpanded((e) => ({ ...e, [path]: true }));
      } else if (prompt.kind === "rename") {
        const parent = prompt.oldPath.includes("/")
          ? prompt.oldPath.slice(0, prompt.oldPath.lastIndexOf("/"))
          : "";
        const newPath = parent ? `${parent}/${val}` : val;
        await renameFileOrFolder(prompt.oldPath, newPath);
      }
    } catch (e) {
      // swallow — we could show a toast in future
      console.warn("[explorer prompt]", e);
    }
    setPrompt(null);
    setPromptValue("");
  }, [
    prompt,
    promptValue,
    createNewFile,
    createNewFolder,
    renameFileOrFolder,
    removeEntry,
    openFile,
    setExplorerOpen,
  ]);

  const renderNode = (node: FileNode, depth: number): React.ReactNode => {
    const isOpen = expanded[node.path];
    return (
      <View key={node.path}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleOpen(node)}
          onLongPress={() =>
            startPrompt({ kind: "rename", oldPath: node.path, oldName: node.name, isDir: node.isDirectory }, node.name)
          }
          style={[
            styles.row,
            { paddingLeft: 12 + depth * 14 },
          ]}
          testID={`fs-entry-${node.path}`}
        >
          {node.isDirectory ? (
            <Feather
              name={isOpen ? "chevron-down" : "chevron-right"}
              size={14}
              color={theme.textSecondary}
              style={{ marginRight: 4 }}
            />
          ) : (
            <View style={{ width: 18 }} />
          )}
          <NodeIcon node={node} color={theme.textSecondary} />
          <Text
            style={[styles.rowText, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            {node.name}
          </Text>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              startPrompt({
                kind: "delete",
                path: node.path,
                name: node.name,
                isDir: node.isDirectory,
              })
            }
            testID={`fs-delete-${node.path}`}
          >
            <Feather name="trash-2" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
        {node.isDirectory && isOpen && node.children && (
          <View>
            {node.children.length === 0 ? (
              <Text
                style={[
                  styles.emptyChild,
                  {
                    color: theme.textSecondary,
                    paddingLeft: 12 + (depth + 1) * 14 + 22,
                  },
                ]}
              >
                (empty)
              </Text>
            ) : (
              node.children.map((c) => renderNode(c, depth + 1))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={isExplorerOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setExplorerOpen(false)}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdropFill}
          onPress={() => setExplorerOpen(false)}
          testID="fs-backdrop"
        />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.surface,
              borderRightColor: theme.border,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
          testID="file-explorer-panel"
        >
          <View
            style={[styles.header, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              EXPLORER
            </Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => startPrompt({ kind: "newFile", parent: "" })}
                testID="fs-new-file"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="file-plus" size={16} color={theme.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => startPrompt({ kind: "newFolder", parent: "" })}
                testID="fs-new-folder"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name="folder-plus"
                  size={16}
                  color={theme.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setExplorerOpen(false)}
                testID="fs-close"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 6 }}>
            {tree.length === 0 ? (
              <Text
                style={[
                  styles.emptyChild,
                  { color: theme.textSecondary, paddingLeft: 16, paddingTop: 20 },
                ]}
              >
                No files yet. Tap + to create one.
              </Text>
            ) : (
              tree.map((n) => renderNode(n, 0))
            )}
          </ScrollView>
        </View>
      </View>

      {/* Prompt / confirm modal */}
      <Modal
        visible={!!prompt}
        transparent
        animationType="fade"
        onRequestClose={() => setPrompt(null)}
      >
        <View style={styles.promptBackdrop}>
          <View
            style={[
              styles.promptCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.promptTitle, { color: theme.textPrimary }]}>
              {prompt?.kind === "newFile" && "New file"}
              {prompt?.kind === "newFolder" && "New folder"}
              {prompt?.kind === "rename" && "Rename"}
              {prompt?.kind === "delete" && "Delete?"}
            </Text>
            {prompt?.kind === "delete" ? (
              <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>
                {`This will permanently delete "${prompt.name}"${prompt.isDir ? " and everything inside it" : ""}.`}
              </Text>
            ) : (
              <TextInput
                value={promptValue}
                onChangeText={setPromptValue}
                placeholder={
                  prompt?.kind === "newFile"
                    ? "filename.js"
                    : prompt?.kind === "newFolder"
                      ? "folder name"
                      : "new name"
                }
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.promptInput,
                  {
                    color: theme.textPrimary,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                  },
                ]}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={confirmPrompt}
                testID="fs-prompt-input"
              />
            )}
            <View style={styles.promptActions}>
              <TouchableOpacity
                onPress={() => setPrompt(null)}
                style={styles.promptBtn}
                testID="fs-prompt-cancel"
              >
                <Text style={{ color: theme.textSecondary, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmPrompt}
                style={[
                  styles.promptBtn,
                  {
                    backgroundColor:
                      prompt?.kind === "delete" ? theme.danger : theme.accent,
                  },
                ]}
                testID="fs-prompt-confirm"
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {prompt?.kind === "delete" ? "Delete" : "OK"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function NodeIcon({ node, color }: { node: FileNode; color: string }) {
  if (node.isDirectory) {
    return (
      <Feather name="folder" size={14} color={color} style={{ marginRight: 6 }} />
    );
  }
  const lang = detectLanguage(node.name);
  const iconName =
    lang.label === "JavaScript" || lang.label === "JSX"
      ? "code"
      : lang.label === "Python"
        ? "terminal"
        : lang.label === "Markdown"
          ? "book-open"
          : lang.label === "HTML"
            ? "layout"
            : lang.label === "CSS"
              ? "droplet"
              : lang.label === "JSON"
                ? "database"
                : "file-text";
  return (
    <Feather
      name={iconName as any}
      size={14}
      color={color}
      style={{ marginRight: 6 }}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: "row" },
  backdropFill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panel: {
    width: "78%",
    maxWidth: 340,
    height: "100%",
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  iconBtn: {
    padding: 6,
    borderRadius: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 12,
    minHeight: 34,
  },
  rowText: {
    flex: 1,
    fontSize: 13,
    marginRight: 8,
  },
  emptyChild: {
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  promptBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  promptCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "monospace",
    fontSize: 14,
    marginBottom: 12,
  },
  promptActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  promptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
});
