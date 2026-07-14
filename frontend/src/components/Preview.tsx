// Live preview for Markdown and HTML files. On native it uses a WebView, on
// web it uses an iframe. Rendered content is sandboxed.
import React, { useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import { useApp } from "@/src/context/AppContext";
import { detectLanguage } from "@/src/lib/themes";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDoc(kind: "html" | "markdown", body: string, isDark: boolean) {
  const bg = isDark ? "#1E1E1E" : "#FFFFFF";
  const fg = isDark ? "#E6E6E6" : "#111111";
  const border = isDark ? "#333" : "#DDD";

  if (kind === "html") {
    // Sanitize scripts to keep the preview safe from the file's own inline JS.
    const cleaned = body.replace(
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      "<!-- script removed by preview -->",
    );
    return cleaned;
  }
  // Markdown: use marked from CDN.
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: ${bg}; color: ${fg}; padding: 18px 20px; line-height: 1.6; margin: 0; }
  h1, h2, h3 { border-bottom: 1px solid ${border}; padding-bottom: 6px; }
  code { background: ${isDark ? "#2A2A2A" : "#F1F1F1"}; padding: 2px 6px; border-radius: 3px; font-family: "JetBrains Mono", monospace; font-size: 0.9em; }
  pre { background: ${isDark ? "#161616" : "#F5F5F5"}; padding: 12px; border-radius: 5px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  a { color: #4EA1F3; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid ${border}; padding: 6px 10px; }
  blockquote { border-left: 3px solid ${border}; margin: 8px 0; padding: 4px 12px; color: ${isDark ? "#AAA" : "#555"}; }
  img { max-width: 100%; }
</style>
</head>
<body>
<div id="root"></div>
<script>
  var src = ${JSON.stringify(body)};
  try { document.getElementById('root').innerHTML = marked.parse(src); }
  catch(e) { document.getElementById('root').innerText = String(e); }
</script>
</body>
</html>`;
}

export default function Preview() {
  const { activeModal, setActiveModal, theme, tabs, activePath } = useApp();

  const activeTab = tabs.find((t) => t.path === activePath);
  const lang = activeTab ? detectLanguage(activeTab.name) : null;
  const kind: "html" | "markdown" | null = !activeTab
    ? null
    : lang?.label === "HTML"
      ? "html"
      : lang?.label === "Markdown"
        ? "markdown"
        : null;

  const doc = useMemo(() => {
    if (!activeTab || !kind) return "";
    return buildDoc(kind, activeTab.content, theme.name === "dark");
  }, [activeTab, kind, theme.name]);

  const isOpen = activeModal === "preview";
  const close = () => setActiveModal(null);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={close}
      transparent={false}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <View style={styles.headerLeft}>
            <Feather name="eye" size={16} color={theme.textPrimary} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {kind === "html"
                ? "HTML Preview"
                : kind === "markdown"
                  ? "Markdown Preview"
                  : "Preview"}
            </Text>
            {activeTab && (
              <Text style={[styles.sub, { color: theme.textSecondary }]}>
                {activeTab.name}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={close}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="preview-close"
          >
            <Feather name="x" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
        {!kind ? (
          <View style={styles.emptyBox}>
            <Feather name="alert-circle" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Preview supports Markdown (.md) and HTML (.html) files.
            </Text>
          </View>
        ) : Platform.OS === "web" ? (
          <iframe
            title="preview"
            srcDoc={doc}
            sandbox="allow-same-origin"
            style={{
              flex: 1,
              border: "none",
              width: "100%",
              height: "100%",
              background: theme.bg,
            } as any}
          />
        ) : (
          <WebView
            source={{ html: doc }}
            originWhitelist={["*"]}
            style={{ flex: 1, backgroundColor: theme.bg }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  title: { fontSize: 14, fontWeight: "700" },
  sub: { fontSize: 12, fontFamily: "monospace" },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 13, textAlign: "center" },
});
