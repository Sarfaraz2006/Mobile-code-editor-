import React, { useEffect, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/src/context/AppContext";

// Sticky quick-key row that appears just above the software keyboard while
// typing code. Tapping a key inserts that character into the active editor.
const QUICK_KEYS = [
  "Tab",
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  "<",
  ">",
  "=",
  ";",
  ":",
  ".",
  ",",
  "'",
  '"',
  "`",
  "|",
  "&",
  "!",
  "?",
  "$",
  "#",
  "@",
  "*",
  "+",
  "-",
  "/",
  "\\",
  "^",
  "_",
];

export default function KeyboardToolbar() {
  const { theme, triggerEditorAction } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderBottomColor: theme.border,
        },
      ]}
      testID="keyboard-toolbar"
    >
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {QUICK_KEYS.map((k) => (
          <TouchableOpacity
            key={k}
            style={[
              styles.key,
              {
                backgroundColor: theme.surfaceActive,
                borderColor: theme.border,
              },
            ]}
            activeOpacity={0.6}
            onPress={() =>
              triggerEditorAction(
                "insert",
                k === "Tab" ? "  " : k,
              )
            }
            testID={`kb-key-${k}`}
          >
            <Text
              style={{
                color: theme.textPrimary,
                fontFamily: "monospace",
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {k}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  scroll: {
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 6,
  },
  key: {
    minWidth: 40,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
