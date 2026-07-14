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

interface Snippet {
  id: string;
  label: string;
  lang: string;
  body: string;
}

const SNIPPETS: Snippet[] = [
  {
    id: "js.fn",
    label: "JS arrow function",
    lang: "JS",
    body: "const ${1:name} = (${2:args}) => {\n  $0\n};\n",
  },
  {
    id: "js.class",
    label: "JS class",
    lang: "JS",
    body: "class ${1:Name} {\n  constructor(${2:args}) {\n    $0\n  }\n}\n",
  },
  {
    id: "js.fetch",
    label: "JS fetch GET",
    lang: "JS",
    body: 'const res = await fetch("${1:https://api.example.com}");\nconst data = await res.json();\nconsole.log(data);\n',
  },
  {
    id: "js.forEach",
    label: "JS for..of loop",
    lang: "JS",
    body: "for (const ${1:item} of ${2:items}) {\n  $0\n}\n",
  },
  {
    id: "js.tryCatch",
    label: "JS try/catch",
    lang: "JS",
    body: "try {\n  $0\n} catch (e) {\n  console.error(e);\n}\n",
  },
  {
    id: "py.def",
    label: "Python function",
    lang: "PY",
    body: 'def ${1:name}(${2:args}):\n    """${3:docstring}"""\n    $0\n',
  },
  {
    id: "py.class",
    label: "Python class",
    lang: "PY",
    body: "class ${1:Name}:\n    def __init__(self, ${2:args}):\n        $0\n",
  },
  {
    id: "py.main",
    label: "Python __main__",
    lang: "PY",
    body: 'if __name__ == "__main__":\n    $0\n',
  },
  {
    id: "py.for",
    label: "Python for loop",
    lang: "PY",
    body: "for ${1:i} in ${2:range(10)}:\n    $0\n",
  },
  {
    id: "py.try",
    label: "Python try/except",
    lang: "PY",
    body: "try:\n    $0\nexcept ${1:Exception} as e:\n    print(e)\n",
  },
  {
    id: "py.requests",
    label: "Python requests",
    lang: "PY",
    body: 'import requests\nres = requests.get("${1:https://api.example.com}")\nprint(res.json())\n',
  },
  {
    id: "html.5",
    label: "HTML5 boilerplate",
    lang: "HTML",
    body:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:Document}</title>\n</head>\n<body>\n  $0\n</body>\n</html>\n',
  },
  {
    id: "md.readme",
    label: "Markdown README skeleton",
    lang: "MD",
    body:
      "# ${1:Project}\n\n${2:Short description}\n\n## Install\n\n\`\`\`bash\n${3:npm install}\n\`\`\`\n\n## Usage\n\n${0:...}\n",
  },
  {
    id: "json.pkg",
    label: "package.json",
    lang: "JSON",
    body:
      '{\n  "name": "${1:my-app}",\n  "version": "0.1.0",\n  "scripts": {\n    "start": "node index.js"\n  },\n  "dependencies": {}\n}\n',
  },
];

// Strip TextMate-style placeholders like `${1:name}` and `$0` so we insert
// clean text on mobile. VS Code snippet UX is a separate feature we can layer
// on later.
function stripPlaceholders(s: string) {
  return s.replace(/\$\{\d+:([^}]+)\}/g, "$1").replace(/\$\d+/g, "");
}

export default function Snippets() {
  const { activeModal, setActiveModal, theme, triggerEditorAction } = useApp();
  const [q, setQ] = useState("");
  const isOpen = activeModal === "snippets";

  const filtered = useMemo(() => {
    if (!q.trim()) return SNIPPETS;
    const needle = q.toLowerCase();
    return SNIPPETS.filter(
      (s) =>
        s.label.toLowerCase().includes(needle) ||
        s.lang.toLowerCase().includes(needle),
    );
  }, [q]);

  const close = () => {
    setActiveModal(null);
    setQ("");
  };

  const insert = (s: Snippet) => {
    triggerEditorAction("insert", stripPlaceholders(s.body));
    close();
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
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              SNIPPETS
            </Text>
            <TouchableOpacity onPress={close} testID="snippets-close">
              <Feather name="x" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchBox, { borderColor: theme.border }]}>
            <Feather name="search" size={14} color={theme.textSecondary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search snippets…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              autoCapitalize="none"
              autoCorrect={false}
              testID="snippets-search"
            />
          </View>
          <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="always">
            {filtered.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.item, { borderBottomColor: theme.border }]}
                onPress={() => insert(s)}
                activeOpacity={0.6}
                testID={`snippet-${s.id}`}
              >
                <View
                  style={[
                    styles.langChip,
                    { backgroundColor: theme.accentMuted },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.accent,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {s.lang}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={{
                      color: theme.textPrimary,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {s.label}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 11,
                      fontFamily: "monospace",
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {stripPlaceholders(s.body).split("\n")[0]}
                  </Text>
                </View>
                <Feather
                  name="plus-circle"
                  size={16}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            ))}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  panel: {
    width: "100%",
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 12, letterSpacing: 1.5, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    minWidth: 42,
    alignItems: "center",
  },
});
