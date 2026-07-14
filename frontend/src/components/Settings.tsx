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

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26];

export default function Settings() {
  const {
    activePanel,
    setActivePanel,
    theme,
    themeName,
    toggleTheme,
    fontSize,
    setFontSize,
    setActiveModal,
    setTerminalOpen,
  } = useApp();
  const insets = useSafeAreaInsets();
  const isOpen = activePanel === "settings";
  const close = () => setActivePanel(null);

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
          <View
            style={[styles.header, { borderBottomColor: theme.border }]}
          >
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
            <SectionTitle theme={theme}>Appearance</SectionTitle>
            <TouchableOpacity
              style={[styles.row, { borderColor: theme.border }]}
              onPress={toggleTheme}
              testID="settings-theme-toggle"
            >
              <Feather
                name={themeName === "dark" ? "moon" : "sun"}
                size={16}
                color={theme.textPrimary}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 13 }}>
                  Theme
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  Currently {themeName === "dark" ? "Dark" : "Light"} — tap to switch
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.row, { borderColor: theme.border, flexDirection: "column", alignItems: "stretch" }]}>
              <View style={styles.rowInner}>
                <Feather name="type" size={16} color={theme.textPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 13 }}>
                    Editor font size
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    Current: {fontSize}px
                  </Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingTop: 10 }}
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
            </View>

            <SectionTitle theme={theme}>Actions</SectionTitle>
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
            <ActionRow
              icon="command"
              label="Command Palette"
              onPress={() => {
                close();
                setTimeout(() => setActiveModal("commandPalette"), 100);
              }}
              theme={theme}
              testID="settings-cmd"
            />

            <SectionTitle theme={theme}>About</SectionTitle>
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
              CodeCraft Mobile — a VS Code style editor for your phone. Files
              are stored on your device. Python and JavaScript can be executed
              locally; use the Terminal for any shell command.
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
      style={[styles.row, { borderColor: theme.border }]}
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
    width: "82%",
    maxWidth: 360,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 8,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chip: {
    minWidth: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
  },
});
