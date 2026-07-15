// Extensions marketplace scaffold. Reads a static catalog of curated open
// source AI-coding tools. Installing/streaming these projects is deferred to
// a future iteration – for now this UI lists what's coming, and users can
// use the "Open Source" button to clone the repo into their workspace via
// the existing GitHub import endpoint.
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { EXTENSION_CATALOG, Extension } from "@/src/lib/extensions";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Extensions() {
  const { activeModal, setActiveModal, theme, bulkImport, appendTerminal, setTerminalOpen } =
    useApp();
  const [installing, setInstalling] = useState<string | null>(null);

  const isOpen = activeModal === "extensions";
  const close = () => {
    if (installing) return;
    setActiveModal(null);
  };

  const cloneExt = async (ext: Extension) => {
    if (!ext.repo_url) return;
    setInstalling(ext.id);
    setTerminalOpen(true);
    appendTerminal(`\n[extension] cloning ${ext.name}…\n`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/github/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ext.repo_url }),
      });
      if (!res.ok) {
        const t = await res.text();
        appendTerminal(`[extension error] ${t.slice(0, 200)}\n`);
      } else {
        const data = await res.json();
        // Namespace files under `extensions/<id>/`.
        const scoped = (data.files || []).map((f: any) => ({
          path: `extensions/${ext.id}/${f.path}`,
          content: f.content,
        }));
        await bulkImport(scoped, false);
        appendTerminal(
          `[extension] installed ${scoped.length} files into extensions/${ext.id}/\n`,
        );
      }
    } catch (e: any) {
      appendTerminal(`[extension network error] ${e?.message || String(e)}\n`);
    } finally {
      setInstalling(null);
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
        activeOpacity={1}
        style={styles.backdrop}
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
              <Feather name="package" size={16} color={theme.textPrimary} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                EXTENSIONS
              </Text>
              <View
                style={[styles.betaChip, { backgroundColor: theme.warning }]}
              >
                <Text style={{ fontSize: 9, fontWeight: "800", color: "#000" }}>
                  BETA
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={close} testID="ext-close">
              <Feather name="x" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 12,
              paddingHorizontal: 16,
              paddingTop: 10,
            }}
          >
            Curated open source AI coding tools. Tap "Clone into workspace" to
            copy the repo files into `extensions/{"<id>"}/`. Full runtime
            integration (LSP, agent processes) is coming next.
          </Text>
          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 12 }}>
            {EXTENSION_CATALOG.map((ext) => (
              <View
                key={ext.id}
                style={[
                  styles.card,
                  { borderColor: theme.border, backgroundColor: theme.bg },
                ]}
                testID={`ext-card-${ext.id}`}
              >
                <View style={styles.cardHead}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.accentMuted },
                    ]}
                  >
                    <Feather name={ext.icon} size={18} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {ext.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 11,
                      }}
                    >
                      {ext.publisher}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: ext.status === "planned" ? theme.warning : theme.success,
                      },
                    ]}
                  >
                    <Text style={{ color: "#000", fontSize: 9, fontWeight: "800" }}>
                      {ext.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    lineHeight: 17,
                    marginTop: 8,
                  }}
                >
                  {ext.description}
                </Text>
                <View style={styles.actions}>
                  {ext.repo_url && (
                    <TouchableOpacity
                      onPress={() => cloneExt(ext)}
                      disabled={installing === ext.id}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor:
                            installing === ext.id ? theme.accentMuted : theme.accent,
                        },
                      ]}
                      testID={`ext-install-${ext.id}`}
                    >
                      <Feather name="download-cloud" size={12} color="#fff" />
                      <Text style={styles.actionBtnText}>
                        {installing === ext.id ? "Cloning…" : "Clone into workspace"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
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
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    maxHeight: "88%",
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
  title: { fontSize: 12, letterSpacing: 1.5, fontWeight: "700" },
  betaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  card: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3 },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
