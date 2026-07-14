import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const HIST_MAX = 60;

export default function Terminal() {
  const {
    isTerminalOpen,
    setTerminalOpen,
    terminalOutput,
    clearTerminal,
    appendTerminal,
    sessionId,
    isRunning,
    setRunning,
    theme,
  } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [prompt, setPrompt] = useState("$");

  useEffect(() => {
    if (isTerminalOpen) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
    }
  }, [terminalOutput, isTerminalOpen]);

  const runCommand = async (command: string) => {
    if (!command.trim() || !sessionId) return;
    appendTerminal(`${prompt} ${command}\n`);
    setHistory((h) => [command, ...h].slice(0, HIST_MAX));
    setHistIdx(-1);
    setCmd("");
    setRunning(true);
    try {
      // Client-side builtins
      if (command.trim() === "clear" || command.trim() === "cls") {
        clearTerminal();
      } else {
        const res = await fetch(`${BACKEND_URL}/api/terminal/exec`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, command }),
        });
        if (!res.ok) {
          const t = await res.text();
          appendTerminal(`[HTTP ${res.status}] ${t}\n`);
        } else {
          const data = await res.json();
          if (data.stdout) appendTerminal(data.stdout);
          if (data.stderr) appendTerminal(data.stderr);
          if (data.cwd) {
            const short = data.cwd.split("/").slice(-1)[0];
            setPrompt(`${short} $`);
          }
          if (data.timed_out) appendTerminal("\n[timed out]\n");
        }
      }
    } catch (e: any) {
      appendTerminal(`[network error] ${e?.message || String(e)}\n`);
    } finally {
      setRunning(false);
    }
  };

  const resetSession = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/terminal/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, command: "" }),
      });
      appendTerminal("\n[session reset]\n");
      setPrompt("$");
    } catch {}
  };

  const historyPrev = () => {
    if (history.length === 0) return;
    const next = Math.min(history.length - 1, histIdx + 1);
    setHistIdx(next);
    setCmd(history[next] || "");
  };
  const historyNext = () => {
    const next = Math.max(-1, histIdx - 1);
    setHistIdx(next);
    setCmd(next === -1 ? "" : history[next] || "");
  };

  if (!isTerminalOpen) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            TERMINAL
          </Text>
          {isRunning && (
            <View
              style={[
                styles.runningPill,
                { backgroundColor: theme.accentMuted },
              ]}
            >
              <Text
                style={{ color: theme.accent, fontSize: 10, fontWeight: "700" }}
              >
                RUNNING
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={resetSession}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="terminal-reset"
          >
            <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
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
            "Interactive terminal. Try `ls`, `pip install requests`, `python -c \"print(2+2)\"`, `curl example.com`.\n"}
        </Text>
      </ScrollView>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.surface, borderTopColor: theme.border },
        ]}
      >
        <Text style={[styles.prompt, { color: theme.accent }]}>{prompt}</Text>
        <TextInput
          value={cmd}
          onChangeText={setCmd}
          onSubmitEditing={() => runCommand(cmd)}
          placeholder="type a command"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.textPrimary }]}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="send"
          blurOnSubmit={false}
          testID="terminal-input"
        />
        <TouchableOpacity
          onPress={historyPrev}
          style={styles.histBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="terminal-hist-prev"
        >
          <Feather name="chevron-up" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={historyNext}
          style={styles.histBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="terminal-hist-next"
        >
          <Feather name="chevron-down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => runCommand(cmd)}
          style={[styles.sendBtn, { backgroundColor: theme.accent }]}
          disabled={isRunning || !cmd.trim()}
          testID="terminal-send"
        >
          <Feather name="corner-down-left" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 340,
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  title: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  runningPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 },
  iconBtn: { padding: 6 },
  body: { flex: 1 },
  output: { fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderTopWidth: 1,
  },
  prompt: { fontFamily: "monospace", fontSize: 13, fontWeight: "700" },
  input: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  histBtn: { padding: 6 },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
});
