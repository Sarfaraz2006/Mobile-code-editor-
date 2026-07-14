import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";

export default function Terminal() {
  const {
    isTerminalOpen,
    setTerminalOpen,
    terminalOutput,
    clearTerminal,
    isRunning,
    theme,
  } = useApp();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isTerminalOpen) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
    }
  }, [terminalOutput, isTerminalOpen]);

  if (!isTerminalOpen) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.terminalBg,
          borderTopColor: theme.border,
        },
      ]}
      testID="terminal-panel"
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Feather name="terminal" size={14} color={theme.textPrimary} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            OUTPUT
          </Text>
          {isRunning && (
            <View
              style={[
                styles.runningPill,
                { backgroundColor: theme.accentMuted },
              ]}
            >
              <Text style={{ color: theme.accent, fontSize: 10, fontWeight: "700" }}>
                RUNNING
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={clearTerminal}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="terminal-clear"
          >
            <Feather name="trash-2" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setTerminalOpen(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="terminal-close"
          >
            <Feather name="chevron-down" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={{ padding: 12 }}
      >
        <Text
          selectable
          style={[styles.output, { color: theme.textPrimary }]}
          testID="terminal-output-text"
        >
          {terminalOutput ||
            "Ready. Tap the Run button to execute the current file."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  title: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  runningPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  iconBtn: { padding: 6 },
  body: { flex: 1 },
  output: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
});
