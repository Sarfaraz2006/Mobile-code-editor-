import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { detectLanguage } from "@/src/lib/themes";

export default function TabBar() {
  const { tabs, activePath, setActive, closeTab, theme } = useApp();

  if (tabs.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.tabBarBg,
          borderBottomColor: theme.border,
          borderTopColor: theme.border,
        },
      ]}
      testID="tab-bar"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = tab.path === activePath;
          return (
            <TouchableOpacity
              key={tab.path}
              onPress={() => setActive(tab.path)}
              activeOpacity={0.7}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? theme.tabActiveBg : "transparent",
                  borderTopColor: isActive ? theme.accent : "transparent",
                },
              ]}
              testID={`tab-${tab.name}`}
            >
              <FileIcon
                name={tab.name}
                color={isActive ? theme.textPrimary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? theme.textPrimary : theme.textSecondary,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
                numberOfLines={1}
              >
                {tab.name}
                {tab.dirty ? " •" : ""}
              </Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => closeTab(tab.path)}
                testID={`tab-close-${tab.name}`}
              >
                <Feather name="x" size={14} color={theme.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FileIcon({ name, color }: { name: string; color: string }) {
  const lang = detectLanguage(name);
  const label = lang.label;
  const iconName =
    label === "JavaScript" || label === "JSX"
      ? "code"
      : label === "Python"
        ? "terminal"
        : label === "Markdown"
          ? "book-open"
          : label === "HTML"
            ? "layout"
            : label === "CSS"
              ? "droplet"
              : label === "JSON"
                ? "database"
                : "file-text";
  return (
    <Feather
      name={iconName as any}
      size={13}
      color={color}
      style={{ marginRight: 6 }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  scrollContent: { flexDirection: "row" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 2,
    minWidth: 100,
    maxWidth: 200,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    marginRight: 8,
    flexShrink: 1,
  },
});
