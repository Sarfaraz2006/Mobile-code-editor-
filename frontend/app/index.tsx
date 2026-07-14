import React, { useCallback } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { AppProvider, useApp } from "@/src/context/AppContext";
import CodeEditor from "@/src/components/CodeEditor";
import FileExplorer from "@/src/components/FileExplorer";
import TabBar from "@/src/components/TabBar";
import Terminal from "@/src/components/Terminal";
import TopBar from "@/src/components/TopBar";
import { detectLanguage } from "@/src/lib/themes";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function EditorScreen() {
  const {
    theme,
    tabs,
    activePath,
    updateActiveContent,
    saveActive,
    setExplorerOpen,
    setTerminalOpen,
    appendTerminal,
    clearTerminal,
    isRunning,
    setRunning,
  } = useApp();
  const insets = useSafeAreaInsets();

  const activeTab = tabs.find((t) => t.path === activePath) || null;
  const activeLang = activeTab ? detectLanguage(activeTab.name) : null;

  const onSave = useCallback(async () => {
    if (!activeTab) return;
    await saveActive();
    appendTerminal(`\n[saved] ${activeTab.path}\n`);
  }, [activeTab, saveActive, appendTerminal]);

  const onRun = useCallback(async () => {
    if (!activeTab || !activeLang || !activeLang.runnable) {
      setTerminalOpen(true);
      appendTerminal(
        `\n[!] Cannot run this file. Only Python and JavaScript are runnable.\n`,
      );
      return;
    }
    // Auto-save before running
    await saveActive();
    setTerminalOpen(true);
    setRunning(true);
    clearTerminal();
    appendTerminal(`▶ Running ${activeTab.name} (${activeLang.label})...\n\n`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeTab.content,
          language: activeLang.runnable,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        appendTerminal(`\n[HTTP ${res.status}] ${t}\n`);
      } else {
        const data = await res.json();
        if (data.stdout) appendTerminal(data.stdout);
        if (data.stderr) appendTerminal(`\n${data.stderr}`);
        appendTerminal(
          `\n\n[exit ${data.exit_code}] ${data.duration_ms}ms${data.timed_out ? " (timeout)" : ""}\n`,
        );
      }
    } catch (e: any) {
      appendTerminal(`\n[Network error] ${e?.message || String(e)}\n`);
    } finally {
      setRunning(false);
    }
  }, [
    activeTab,
    activeLang,
    saveActive,
    setRunning,
    setTerminalOpen,
    appendTerminal,
    clearTerminal,
  ]);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle={theme.name === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.surface}
      />
      <TopBar onSave={onSave} onRun={onRun} />
      <TabBar />

      <View style={styles.editorArea} testID="editor-area">
        {activeTab ? (
          <CodeEditor
            key={activeTab.path}
            path={activeTab.path}
            content={activeTab.content}
            onChange={updateActiveContent}
          />
        ) : (
          <EmptyState />
        )}
      </View>

      <Terminal />

      {/* Bottom toolbar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 6),
          },
        ]}
        testID="bottom-bar"
      >
        <ToolbarButton
          icon="folder"
          label="Files"
          onPress={() => setExplorerOpen(true)}
          testID="bottom-explorer-btn"
        />
        <ToolbarButton
          icon="save"
          label="Save"
          onPress={onSave}
          disabled={!activeTab}
          testID="bottom-save-btn"
        />
        <ToolbarButton
          icon="terminal"
          label="Output"
          onPress={() => setTerminalOpen(true)}
          testID="bottom-terminal-btn"
        />
        <RunFab onPress={onRun} disabled={!activeLang?.runnable || isRunning} />
      </View>

      <FileExplorer />
    </SafeAreaView>
  );
}

function ToolbarButton({
  icon,
  label,
  onPress,
  disabled,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) {
  const { theme } = useApp();
  return (
    <TouchableOpacity
      style={styles.toolbarBtn}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      testID={testID}
    >
      <Feather
        name={icon}
        size={18}
        color={disabled ? theme.textSecondary : theme.textPrimary}
      />
      <Text
        style={[
          styles.toolbarBtnText,
          { color: disabled ? theme.textSecondary : theme.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RunFab({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme, isRunning } = useApp();
  return (
    <TouchableOpacity
      style={[
        styles.runFab,
        {
          backgroundColor: disabled ? theme.accentMuted : theme.accent,
          opacity: disabled ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      testID="run-code-button"
    >
      <Feather
        name={isRunning ? "loader" : "play"}
        size={18}
        color="#fff"
      />
      <Text style={styles.runFabText}>Run</Text>
    </TouchableOpacity>
  );
}

function EmptyState() {
  const { theme, setExplorerOpen } = useApp();
  return (
    <View
      style={[styles.emptyRoot, { backgroundColor: theme.editorBg }]}
      testID="editor-empty-state"
    >
      <View style={styles.emptyBg}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwyfHxjb2RpbmclMjBhYnN0cmFjdCUyMGRhcmt8ZW58MHx8fHwxNzg0MDY2MDY4fDA&ixlib=rb-4.1.0&q=85",
          }}
          resizeMode="cover"
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: theme.name === "dark" ? 0.06 : 0.04 },
          ]}
        />
      </View>
      <View style={styles.emptyInner}>
        <Feather name="code" size={44} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          CodeCraft
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          A VS Code style editor, built for your phone.
        </Text>
        <TouchableOpacity
          onPress={() => setExplorerOpen(true)}
          style={[styles.emptyCta, { backgroundColor: theme.accent }]}
          testID="empty-open-explorer"
        >
          <Feather name="folder" size={16} color="#fff" />
          <Text style={styles.emptyCtaText}>Open File Explorer</Text>
        </TouchableOpacity>
        <Text
          style={[styles.emptyHint, { color: theme.textSecondary }]}
        >
          Tap a file in the explorer to start editing.
        </Text>
      </View>
    </View>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <EditorScreen />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  editorArea: { flex: 1 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 4,
  },
  toolbarBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 2,
  },
  toolbarBtnText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  runFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    gap: 6,
    minWidth: 88,
  },
  runFabText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyRoot: { flex: 1 },
  emptyBg: { ...StyleSheet.absoluteFillObject },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 18,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 28,
  },
  emptyCtaText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyHint: { fontSize: 11, marginTop: 16, textAlign: "center" },
});
