// Search across ALL files in the workspace. Client-side implementation using
// the AsyncStorage-backed FS.
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { FileNode, readFile } from "@/src/lib/fs";

interface Match {
  path: string;
  line: number;
  preview: string;
}

export default function SearchAcrossFiles() {
  const { activePanel, setActivePanel, theme, tree, openFile } = useApp();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<Match[]>([]);
  const [running, setRunning] = useState(false);

  const isOpen = activePanel === "search";
  const close = () => setActivePanel(null);

  const flatFiles = useMemo(() => {
    const out: FileNode[] = [];
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.isDirectory) walk(n.children || []);
        else out.push(n);
      }
    };
    walk(tree);
    return out;
  }, [tree]);

  const run = useCallback(async () => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setRunning(true);
    const needle = caseSensitive ? q : q.toLowerCase();
    const acc: Match[] = [];
    try {
      for (const f of flatFiles) {
        let content = "";
        try {
          content = await readFile(f.path);
        } catch {
          continue;
        }
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const hay = caseSensitive ? lines[i] : lines[i].toLowerCase();
          if (hay.includes(needle)) {
            acc.push({ path: f.path, line: i + 1, preview: lines[i] });
            if (acc.length > 400) break;
          }
        }
        if (acc.length > 400) break;
      }
    } finally {
      setResults(acc);
      setRunning(false);
    }
  }, [q, caseSensitive, flatFiles]);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropFill}
          onPress={close}
          activeOpacity={1}
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
          testID="search-panel"
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              SEARCH
            </Text>
            <TouchableOpacity onPress={close} testID="search-close" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 12 }}>
            <View style={[styles.inputBox, { borderColor: theme.border }]}>
              <Feather name="search" size={14} color={theme.textSecondary} />
              <TextInput
                value={q}
                onChangeText={setQ}
                onSubmitEditing={run}
                placeholder="Search all files…"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: theme.textPrimary }]}
                testID="search-input"
              />
              <TouchableOpacity
                onPress={() => setCaseSensitive((v) => !v)}
                style={[
                  styles.caseBtn,
                  {
                    backgroundColor: caseSensitive
                      ? theme.accent
                      : theme.surfaceActive,
                  },
                ]}
                testID="search-case"
              >
                <Text
                  style={{
                    color: caseSensitive ? "#fff" : theme.textPrimary,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  Aa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={run}
                style={[styles.runBtn, { backgroundColor: theme.accent }]}
                testID="search-run"
              >
                <Feather name="corner-down-left" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text
              style={{ color: theme.textSecondary, fontSize: 11, marginTop: 8 }}
            >
              {running
                ? "Searching…"
                : `${results.length} match${results.length === 1 ? "" : "es"}`}
            </Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {results.map((r, i) => (
              <TouchableOpacity
                key={r.path + ":" + r.line + ":" + i}
                style={[styles.result, { borderBottomColor: theme.border }]}
                onPress={async () => {
                  await openFile(r.path);
                  close();
                }}
                testID={`search-result-${i}`}
              >
                <View style={styles.resultHead}>
                  <Feather name="file-text" size={12} color={theme.textSecondary} />
                  <Text
                    style={{
                      color: theme.textPrimary,
                      fontSize: 12,
                      fontFamily: "monospace",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {r.path}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                    L{r.line}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 11,
                    fontFamily: "monospace",
                    marginTop: 4,
                    marginLeft: 18,
                  }}
                  numberOfLines={2}
                >
                  {r.preview.trim()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: "row" },
  backdropFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panel: {
    width: "82%",
    maxWidth: 360,
    height: "100%",
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 5,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
  },
  caseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 3,
  },
  runBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 3,
  },
  result: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
