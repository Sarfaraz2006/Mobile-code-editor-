import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import {
  FONT_FAMILIES,
  FontFamilyKey,
  THEME_ORDER,
  themes,
} from "@/src/lib/themes";
import { exportWorkspaceZip } from "@/src/lib/zipExport";

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26];

export default function Settings() {
  const {
    activePanel,
    setActivePanel,
    theme,
    themeName,
    setThemeName,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    setActiveModal,
    setTerminalOpen,
    appendTerminal,
  } = useApp();
  const insets = useSafeAreaInsets();
  const isOpen = activePanel === "settings";
  const close = () => setActivePanel(null);

  const doExport = async () => {
    setTerminalOpen(true);
    appendTerminal("\n[zip] building project archive…\n");
    const r = await exportWorkspaceZip();
    if (r.ok) appendTerminal(`[zip] exported ${r.fileCount} files.\n`);
    else appendTerminal(`[zip] failed: ${r.reason}\n`);
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
          onPress={close}
          activeOpacity={1}
        />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.surface,
              borderLeftColor: theme.border,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
          testID="settings-panel"
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              SETTINGS
            </Text>
            <TouchableOpacity
              onPress={close}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="settings-close"
            >
              <Feather name="x" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <SectionTitle theme={theme}>Theme</SectionTitle>
            {THEME_ORDER.map((t) => {
              const info = themes[t];
              const active = t === themeName;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setThemeName(t)}
                  style={[
                    styles.themeRow,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.accentMuted : theme.bg,
                    },
                  ]}
                  testID={`theme-${t}`}
                >
                  <View
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: info.editorBg, borderColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeSwatchDot,
                        { backgroundColor: info.accent },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {info.label}
                    </Text>
                    <Text
                      style={{ color: theme.textSecondary, fontSize: 11 }}
                    >
                      {info.isDark ? "Dark" : "Light"}
                    </Text>
                  </View>
                  {active && (
                    <Feather name="check" size={16} color={theme.accent} />
                  )}
                </TouchableOpacity>
              );
            })}

            <SectionTitle theme={theme}>Editor font</SectionTitle>
            {(Object.keys(FONT_FAMILIES) as FontFamilyKey[]).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFontFamily(f)}
                style={[
                  styles.fontRow,
                  {
                    borderColor:
                      f === fontFamily ? theme.accent : theme.border,
                    backgroundColor:
                      f === fontFamily ? theme.accentMuted : theme.bg,
                  },
                ]}
                testID={`font-family-${f}`}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 13,
                    fontWeight: "600",
                    flex: 1,
                  }}
                >
                  {FONT_FAMILIES[f].label}
                </Text>
                {f === fontFamily && (
                  <Feather name="check" size={16} color={theme.accent} />
                )}
              </TouchableOpacity>
            ))}

            <SectionTitle theme={theme}>Font size ({fontSize}px)</SectionTitle>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {FONT_SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFontSize(s)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        s === fontSize ? theme.accent : theme.surfaceActive,
                      borderColor: theme.border,
                    },
                  ]}
                  testID={`font-${s}`}
                >
                  <Text
                    style={{
                      color: s === fontSize ? "#fff" : theme.textPrimary,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <SectionTitle theme={theme}>Actions</SectionTitle>
            <ActionRow
              icon="download"
              label="Export project as .zip"
              onPress={doExport}
              theme={theme}
              testID="settings-export-zip"
            />
            <ActionRow
              icon="git-branch"
              label="Git panel"
              onPress={() => {
                close();
                setTimeout(() => setActivePanel("git"), 100);
              }}
              theme={theme}
              testID="settings-git"
            />
            <ActionRow
              icon="package"
              label="Extensions (beta)"
              onPress={() => {
                close();
                setTimeout(() => setActiveModal("extensions"), 100);
              }}
              theme={theme}
              testID="settings-extensions"
            />
            <ActionRow
              icon="download-cloud"
              label="Import from GitHub"
              onPress={() => {
                close();
                setTimeout(() => setActiveModal("githubImport"), 100);
              }}
              theme={theme}
              testID="settings-github"
            />
            <ActionRow
              icon="terminal"
              label="Open Terminal"
              onPress={() => {
                close();
                setTimeout(() => setTerminalOpen(true), 100);
              }}
              theme={theme}
              testID="settings-terminal"
            />

            <SectionTitle theme={theme}>About</SectionTitle>
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
              CodeCraft Mobile — a VS Code style editor for your phone. Files
              stored locally, code runs on-device via secure backend sandbox,
              real terminal, Git, and an extensions marketplace scaffold ready
              for AI coding tools.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SectionTitle({
  theme,
  children,
}: {
  theme: any;
  children: React.ReactNode;
}) {
  return (
    <Text
      style={{
        color: theme.textSecondary,
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: "700",
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  theme,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  theme: any;
  testID: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, { borderColor: theme.border }]}
      onPress={onPress}
      testID={testID}
    >
      <Feather name={icon} size={16} color={theme.textPrimary} />
      <Text style={{ color: theme.textPrimary, fontSize: 13, flex: 1 }}>
        {label}
      </Text>
      <Feather name="chevron-right" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
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
    marginLeft: "auto",
    width: "86%",
    maxWidth: 380,
    height: "100%",
    borderLeftWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 6,
  },
  themeSwatch: {
    width: 36,
    height: 26,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 3,
  },
  themeSwatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fontRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 6,
  },
  chip: {
    minWidth: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 8,
  },
});
