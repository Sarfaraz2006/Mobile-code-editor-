// Client-side Git operations panel. All heavy lifting is done server-side via
// /api/git/*. Before every status/commit we sync the workspace's dirty files
// into the server-side repo working tree, so what you see is truly what will
// commit.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface StatusLine {
  raw: string;
  state: string;
  path: string;
}

function parseStatus(stdout: string): { branch: string; lines: StatusLine[] } {
  const lines = stdout.split("\n").filter(Boolean);
  let branch = "main";
  const out: StatusLine[] = [];
  for (const l of lines) {
    if (l.startsWith("##")) {
      const rest = l.slice(3);
      branch = rest.split("...")[0].split(" ")[0] || "main";
      continue;
    }
    const state = l.slice(0, 2);
    const path = l.slice(3);
    out.push({ raw: l, state, path });
  }
  return { branch, lines: out };
}

export default function GitPanel() {
  const {
    activePanel,
    setActivePanel,
    theme,
    tree,
    sessionId,
    appendTerminal,
    setTerminalOpen,
  } = useApp();
  const insets = useSafeAreaInsets();

  const [inited, setInited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [branch, setBranch] = useState("main");
  const [status, setStatus] = useState<StatusLine[]>([]);
  const [log, setLog] = useState<string>("");
  const [commitMsg, setCommitMsg] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const isOpen = activePanel === "git";
  const close = () => setActivePanel(null);

  const flatFiles = useCallback(() => {
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

  const syncFiles = useCallback(async () => {
    const files: { path: string; content: string }[] = [];
    for (const f of flatFiles()) {
      try {
        const content = await readFile(f.path);
        files.push({ path: f.path, content });
      } catch {}
    }
    await fetch(`${BACKEND_URL}/api/git/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, files }),
    });
  }, [flatFiles, sessionId]);

  const callGit = useCallback(
    async (endpoint: string, body: any = {}) => {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, ...body }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${endpoint} failed: ${t.slice(0, 200)}`);
      }
      return res.json();
    },
    [sessionId],
  );

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    setBusy(true);
    setErr(null);
    try {
      await syncFiles();
      const s = await callGit("/api/git/status");
      const parsed = parseStatus(s.stdout || "");
      setBranch(parsed.branch);
      setStatus(parsed.lines);
      const l = await callGit("/api/git/log");
      setLog(l.stdout || "");
      const r = await callGit("/api/git/remote");
      const remoteLine = (r.stdout || "").split("\n").find((x: string) => x.startsWith("origin"));
      if (remoteLine) {
        const m = remoteLine.match(/^origin\s+(\S+)/);
        if (m) setRemoteUrl(m[1]);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [syncFiles, callGit, sessionId]);

  useEffect(() => {
    if (isOpen && sessionId) {
      (async () => {
        setBusy(true);
        setErr(null);
        try {
          const r = await callGit("/api/git/init");
          setInited(true);
          appendTerminal(`\n[git] ${r.stdout || "initialized"}\n`);
        } catch (e: any) {
          setErr(e?.message || String(e));
        } finally {
          setBusy(false);
        }
        await refresh();
      })();
    }
  }, [isOpen, sessionId, callGit, appendTerminal, refresh]);

  const doCommit = async () => {
    if (!commitMsg.trim()) {
      setErr("Enter a commit message");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await syncFiles();
      await callGit("/api/git/add", { args: ["."] });
      const r = await callGit("/api/git/commit", { message: commitMsg });
      setTerminalOpen(true);
      appendTerminal(`\n[git commit] ${r.stdout || ""}${r.stderr || ""}\n`);
      setCommitMsg("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const doPush = async () => {
    if (!remoteUrl.trim()) {
      setErr("Set a remote URL first");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await callGit("/api/git/remote", { remote_url: remoteUrl.trim() });
      const r = await callGit("/api/git/push", { branch });
      setTerminalOpen(true);
      appendTerminal(
        `\n[git push] ${r.stdout || ""}${r.stderr || ""}\n(exit ${r.exit_code})\n`,
      );
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

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
          activeOpacity={1}
          onPress={close}
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
          testID="git-panel"
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <Feather name="git-branch" size={16} color={theme.textPrimary} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                GIT
              </Text>
              {inited && (
                <Text style={{ color: theme.accent, fontSize: 11, fontFamily: "monospace" }}>
                  ({branch})
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <TouchableOpacity
                onPress={refresh}
                disabled={busy}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID="git-refresh"
                style={{ padding: 6 }}
              >
                <Feather name="refresh-cw" size={16} color={theme.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={close}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID="git-close"
                style={{ padding: 6 }}
              >
                <Feather name="x" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {busy && (
              <View style={styles.busy}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Working…
                </Text>
              </View>
            )}
            {err && (
              <Text
                style={{
                  color: theme.danger,
                  fontSize: 12,
                  fontFamily: "monospace",
                  marginBottom: 10,
                }}
              >
                {err}
              </Text>
            )}

            <Section theme={theme}>Changes ({status.length})</Section>
            {status.length === 0 ? (
              <Text style={{ color: theme.textSecondary, fontSize: 12, paddingVertical: 6 }}>
                Working tree clean.
              </Text>
            ) : (
              status.map((s) => (
                <View
                  key={s.path}
                  style={[styles.statusRow, { borderColor: theme.border }]}
                >
                  <View
                    style={[
                      styles.stateChip,
                      {
                        backgroundColor:
                          s.state.trim() === "M"
                            ? theme.warning
                            : s.state.trim() === "??"
                              ? theme.success
                              : s.state.trim() === "D"
                                ? theme.danger
                                : theme.accent,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>
                      {s.state.trim() === "??" ? "U" : s.state.trim() || "?"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.textPrimary,
                      fontSize: 12,
                      fontFamily: "monospace",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {s.path}
                  </Text>
                </View>
              ))
            )}

            <Section theme={theme}>Commit</Section>
            <TextInput
              value={commitMsg}
              onChangeText={setCommitMsg}
              placeholder="Commit message"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bg },
              ]}
              testID="git-commit-msg"
              editable={!busy}
            />
            <TouchableOpacity
              onPress={doCommit}
              disabled={busy}
              style={[styles.btn, { backgroundColor: theme.accent }]}
              testID="git-commit-btn"
            >
              <Feather name="check-circle" size={14} color="#fff" />
              <Text style={styles.btnText}>Commit all</Text>
            </TouchableOpacity>

            <Section theme={theme}>Remote (push)</Section>
            <TextInput
              value={remoteUrl}
              onChangeText={setRemoteUrl}
              placeholder="https://github.com/user/repo.git"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bg, fontFamily: "monospace" },
              ]}
              testID="git-remote-url"
              editable={!busy}
            />
            <TouchableOpacity
              onPress={doPush}
              disabled={busy || !remoteUrl.trim()}
              style={[styles.btn, { backgroundColor: theme.success }]}
              testID="git-push-btn"
            >
              <Feather name="upload-cloud" size={14} color="#fff" />
              <Text style={styles.btnText}>Push to origin/{branch}</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6 }}>
              For private repos use a URL with a personal-access token, e.g.
              `https://TOKEN@github.com/user/repo.git`.
            </Text>

            <Section theme={theme}>Log</Section>
            <Text
              selectable
              style={{
                color: theme.textPrimary,
                fontSize: 11,
                fontFamily: "monospace",
                lineHeight: 16,
              }}
            >
              {log || "No commits yet."}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <Text
      style={{
        color: theme.textSecondary,
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: "700",
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: "row" },
  backdropFill: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panel: {
    width: "85%",
    maxWidth: 380,
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  busy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  stateChip: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 4,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
