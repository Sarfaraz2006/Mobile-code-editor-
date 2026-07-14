import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { detectLanguage } from "@/src/lib/themes";

interface Props {
  onSave: () => void;
  onRun: () => void;
}

export default function TopBar({ onSave, onRun }: Props) {
  const {
    theme,
    themeName,
    toggleTheme,
    setExplorerOpen,
    setTerminalOpen,
    isTerminalOpen,
    tabs,
    activePath,
  } = useApp();

  const activeTab = tabs.find((t) => t.path === activePath);
  const lang = activeTab ? detectLanguage(activeTab.name) : null;

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
        onPress={() => setExplorerOpen(true)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        testID="top-explorer-btn"
      >
        <Feather name="folder" size={20} color={theme.textPrimary} />
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
          onPress={toggleTheme}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          testID="top-theme-btn"
        >
          <Feather
            name={themeName === "dark" ? "sun" : "moon"}
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 52,
    gap: 4,
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
  },
  centerBox: {
    flex: 1,
    paddingHorizontal: 6,
  },
  title: { fontSize: 14, fontWeight: "600" },
  subtitle: { fontSize: 10, marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 2 },
});
