import React, { useMemo, useState } from "react";
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

import { useApp } from "@/src/context/AppContext";

interface CmdEntry {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  run: () => void | Promise<void>;
}

export default function CommandPalette() {
  const {
    activeModal,
    setActiveModal,
    theme,
    tabs,
    setActive,
    openFile,
    saveActive,
    saveAll,
    toggleTheme,
    setTerminalOpen,
    setActivePanel,
    triggerEditorAction,
    activePath,
    tree,
  } = useApp();
  const [q, setQ] = useState("");

  const flatFiles = useMemo(() => {
    const out: { path: string; name: string }[] = [];
    const walk = (nodes: typeof tree) => {
      for (const n of nodes) {
        if (n.isDirectory) walk(n.children || []);
        else out.push({ path: n.path, name: n.name });
      }
    };
    walk(tree);
    return out;
  }, [tree]);

  const commands: CmdEntry[] = useMemo(() => {
    const list: CmdEntry[] = [
      {
        id: "save",
        label: "Save file",
        hint: "Save the current tab",
        icon: "save",
        run: () => saveActive(),
      },
      {
        id: "saveAll",
        label: "Save all",
        icon: "save",
        run: () => saveAll(),
      },
      {
        id: "find",
        label: "Find in file",
        icon: "search",
        run: () => triggerEditorAction("action", "find"),
      },
      {
        id: "replace",
        label: "Replace in file",
        icon: "search",
        run: () => triggerEditorAction("action", "replace"),
      },
      {
        id: "goto",
        label: "Go to line…",
        icon: "arrow-right",
        run: () => triggerEditorAction("action", "jumpToLine"),
      },
      {
        id: "format",
        label: "Format document",
        icon: "code",
        run: () => setActiveModal(null),
      },
      {
        id: "foldAll",
        label: "Fold all",
        icon: "chevrons-right",
        run: () => triggerEditorAction("action", "foldAll"),
      },
      {
        id: "unfoldAll",
        label: "Unfold all",
        icon: "chevrons-down",
        run: () => triggerEditorAction("action", "unfoldAll"),
      },
      {
        id: "commentLine",
        label: "Toggle line comment",
        icon: "hash",
        run: () => triggerEditorAction("action", "commentLine"),
      },
      {
        id: "theme",
        label: "Toggle theme",
        icon: "sun",
        run: () => toggleTheme(),
      },
      {
        id: "terminal",
        label: "Toggle terminal",
        icon: "terminal",
        run: () => setTerminalOpen(true),
      },
      {
        id: "explorer",
        label: "Open Explorer",
        icon: "folder",
        run: () => setActivePanel("explorer"),
      },
      {
        id: "search",
        label: "Search across files",
        icon: "search",
        run: () => setActivePanel("search"),
      },
      {
        id: "snippets",
        label: "Insert snippet…",
        icon: "clipboard",
        run: () => setActiveModal("snippets"),
      },
      {
        id: "github",
        label: "Import from GitHub…",
        icon: "download-cloud",
        run: () => setActiveModal("githubImport"),
      },
      {
        id: "preview",
        label: "Preview (Markdown / HTML)",
        icon: "eye",
        run: () => setActiveModal("preview"),
      },
      {
        id: "settings",
        label: "Settings",
        icon: "settings",
        run: () => setActivePanel("settings"),
      },
    ];
    // Add open-tab entries and file entries
    for (const t of tabs) {
      list.push({
        id: "tab:" + t.path,
        label: "Switch to " + t.name,
        hint: t.path,
        icon: "file-text",
        run: () => setActive(t.path),
      });
    }
    for (const f of flatFiles) {
      list.push({
        id: "open:" + f.path,
        label: "Open " + f.name,
        hint: f.path,
        icon: "file",
        run: () => openFile(f.path),
      });
    }
    return list;
  }, [
    tabs,
    flatFiles,
    saveActive,
    saveAll,
    triggerEditorAction,
    toggleTheme,
    setTerminalOpen,
    setActivePanel,
    setActive,
    openFile,
    setActiveModal,
  ]);

  const filtered = useMemo(() => {
    if (!q.trim()) return commands.slice(0, 30);
    const needle = q.toLowerCase();
    return commands
      .filter(
        (c) =>
          c.label.toLowerCase().includes(needle) ||
          (c.hint || "").toLowerCase().includes(needle),
      )
      .slice(0, 30);
  }, [commands, q]);

  const isOpen = activeModal === "commandPalette";
  const close = () => {
    setActiveModal(null);
    setQ("");
  };

  const execute = async (c: CmdEntry) => {
    close();
    setTimeout(() => c.run(), 60);
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={close}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[
            styles.panel,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={[styles.searchBox, { borderColor: theme.border }]}>
            <Feather name="command" size={16} color={theme.textSecondary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Type a command or file name…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              testID="cmd-palette-input"
            />
          </View>
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="always"
          >
            {filtered.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.item}
                onPress={() => execute(c)}
                activeOpacity={0.6}
                testID={`cmd-item-${c.id}`}
              >
                <Feather
                  name={c.icon}
                  size={14}
                  color={theme.textSecondary}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 13 }}>
                    {c.label}
                  </Text>
                  {c.hint && (
                    <Text
                      style={{ color: theme.textSecondary, fontSize: 11 }}
                      numberOfLines={1}
                    >
                      {c.hint}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {filtered.length === 0 && (
              <Text
                style={{
                  color: theme.textSecondary,
                  padding: 16,
                  fontSize: 12,
                }}
              >
                No matching commands.
              </Text>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 90,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 520,
    maxHeight: 440,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  list: { maxHeight: 360 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
