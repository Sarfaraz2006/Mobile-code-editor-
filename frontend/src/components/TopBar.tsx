import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { detectLanguage } from "@/src/lib/themes";

interface Props {
  onSave: () => void;
  onFormat: () => void;
}

export default function TopBar({ onSave, onFormat }: Props) {
  const {
    theme,
    themeName,
    toggleTheme,
    setActivePanel,
    setActiveModal,
    setTerminalOpen,
    isTerminalOpen,
    triggerEditorAction,
    tabs,
    activePath,
  } = useApp();

  const activeTab = tabs.find((t) => t.path === activePath);
  const lang = activeTab ? detectLanguage(activeTab.name) : null;
  const canPreview =
    lang?.label === "HTML" || lang?.label === "Markdown";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderBottomColor: theme.border },
      ]}
      testID="top-bar"
    >
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setActivePanel("explorer")}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        testID="top-explorer-btn"
      >
        <Feather name="folder" size={20} color={theme.textPrimary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setActivePanel("search")}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        testID="top-search-btn"
      >
        <Feather name="search" size={18} color={theme.textPrimary} />
      </TouchableOpacity>

      <View style={styles.centerBox}>
        <Text
          style={[styles.title, { color: theme.textPrimary }]}
          numberOfLines={1}
        >
          {activeTab
            ? `${activeTab.name}${activeTab.dirty ? " •" : ""}`
            : "CodeCraft"}
        </Text>
        {lang && (
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {lang.label}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => triggerEditorAction("action", "find")}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          testID="top-find-btn"
          disabled={!activeTab}
        >
          <Feather
            name="zoom-in"
            size={18}
            color={activeTab ? theme.textPrimary : theme.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setActiveModal("commandPalette")}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          testID="top-cmd-btn"
        >
          <Feather name="command" size={18} color={theme.textPrimary} />
        </TouchableOpacity>
        {canPreview && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setActiveModal("preview")}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            testID="top-preview-btn"
          >
            <Feather name="eye" size={18} color={theme.accent} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onFormat}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          testID="top-format-btn"
          disabled={!activeTab}
        >
          <Feather
            name="align-left"
            size={18}
            color={activeTab ? theme.textPrimary : theme.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onSave}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          testID="top-save-btn"
          disabled={!activeTab}
        >
          <Feather
            name="save"
            size={18}
            color={activeTab ? theme.textPrimary : theme.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setTerminalOpen(!isTerminalOpen)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          testID="top-terminal-btn"
        >
          <Feather
            name="terminal"
            size={18}
            color={isTerminalOpen ? theme.accent : theme.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setActivePanel("settings")}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          testID="top-settings-btn"
        >
          <Feather
            name="settings"
            size={18}
            color={theme.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  iconBtn: {
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: 4,
  },
  centerBox: {
    flex: 1,
    paddingHorizontal: 4,
  },
  title: { fontSize: 13, fontWeight: "600" },
  subtitle: { fontSize: 10, marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center" },
});
