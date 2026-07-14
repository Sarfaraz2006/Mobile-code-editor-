import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GithubImport() {
  const { activeModal, setActiveModal, theme, bulkImport, appendTerminal, setTerminalOpen } =
    useApp();
  const [url, setUrl] = useState("");
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOpen = activeModal === "githubImport";

  const close = () => {
    if (loading) return;
    setActiveModal(null);
    setUrl("");
    setStatus(null);
    setError(null);
  };

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setStatus("Contacting GitHub…");
    try {
      const res = await fetch(`${BACKEND_URL}/api/github/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const t = await res.text();
        setError(`Import failed (${res.status}): ${t.slice(0, 200)}`);
        setStatus(null);
        return;
      }
      const data = await res.json();
      setStatus(`Fetched ${data.file_count} files from ${data.repo}@${data.branch}. Writing…`);
      await bulkImport(data.files, replace);
      setTerminalOpen(true);
      appendTerminal(
        `\n[github] Imported ${data.file_count} files from ${data.repo}@${data.branch}` +
          (data.skipped_binary ? ` (${data.skipped_binary} binary/skipped)` : "") +
          (data.truncated ? " (truncated)" : "") +
          "\n",
      );
      setActiveModal(null);
      setUrl("");
      setStatus(null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setStatus(null);
    } finally {
      setLoading(false);
    }
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
            <View style={styles.headerLeft}>
              <Feather name="github" size={16} color={theme.textPrimary} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Import from GitHub
              </Text>
            </View>
            <TouchableOpacity onPress={close} testID="gh-close">
              <Feather name="x" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>
            <Text
              style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}
            >
              Paste a public GitHub repo URL. Text files are imported into your
              workspace.
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://github.com/expo/examples"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                },
              ]}
              testID="gh-url-input"
              editable={!loading}
            />
            <View style={styles.row}>
              <Text style={{ color: theme.textPrimary, fontSize: 13, flex: 1 }}>
                Replace workspace
              </Text>
              <Switch
                value={replace}
                onValueChange={setReplace}
                disabled={loading}
                testID="gh-replace-switch"
              />
            </View>
            <Text
              style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 12 }}
            >
              ON = wipe existing files first. OFF = merge (existing files overwritten by matching paths).
            </Text>
            {status && (
              <Text
                style={{
                  color: theme.accent,
                  fontSize: 12,
                  marginBottom: 8,
                  fontFamily: "monospace",
                }}
              >
                {status}
              </Text>
            )}
            {error && (
              <Text
                style={{
                  color: theme.danger,
                  fontSize: 12,
                  marginBottom: 8,
                  fontFamily: "monospace",
                }}
              >
                {error}
              </Text>
            )}
            <TouchableOpacity
              onPress={run}
              disabled={loading || !url.trim()}
              style={[
                styles.btn,
                {
                  backgroundColor:
                    loading || !url.trim() ? theme.accentMuted : theme.accent,
                },
              ]}
              testID="gh-import-btn"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="download-cloud" size={16} color="#fff" />
              )}
              <Text style={styles.btnText}>
                {loading ? "Importing…" : "Import Repository"}
              </Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 14, fontWeight: "700" },
  body: { padding: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "monospace",
    fontSize: 13,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 5,
    marginTop: 4,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
