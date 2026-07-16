import React, { useMemo, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeModules,
  DeviceEventEmitter,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/src/context/AppContext";
import { buildTerminalHtml } from "@/src/lib/terminalHtml";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export default function Terminal() {
  const {
    isTerminalOpen,
    setTerminalOpen,
    sessionId,
    isRunning,
    theme,
  } = useApp();
  const webViewRef = useRef<WebView>(null);

  const html = useMemo(() => {
    return buildTerminalHtml({
      theme,
      backendUrl: BACKEND_URL,
      sessionId,
    });
  }, [theme, sessionId]);

  useEffect(() => {
    if (!isTerminalOpen || Platform.OS !== "android") return;

    const subscription = DeviceEventEmitter.addListener("onShellData", (data) => {
      if (data) {
        const escaped = JSON.stringify(data);
        webViewRef.current?.injectJavaScript(`window.writeTerminalData(${escaped}); true;`);
      }
    });

    return () => {
      subscription.remove();
      if (NativeModules.LocalTerminalModule) {
        NativeModules.LocalTerminalModule.closeShell();
      }
    };
  }, [isTerminalOpen]);

  if (!isTerminalOpen) return null;

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        if (NativeModules.LocalTerminalModule && Platform.OS === "android") {
          NativeModules.LocalTerminalModule.startShell("/data/data/com.emergent.portabledevstudio.nojt5o/files");
        }
      } else if (msg.type === "input") {
        if (NativeModules.LocalTerminalModule && Platform.OS === "android") {
          NativeModules.LocalTerminalModule.writeShellData(msg.data);
        }
      }
    } catch (e) {}
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.terminalBg,
          borderTopColor: theme.border,
        },
      ]}
      testID="terminal-panel"
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Feather name="terminal" size={14} color={theme.textPrimary} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            TERMINAL (LOCAL SHELL)
          </Text>
          {isRunning && (
            <View
              style={[
                styles.runningPill,
                { backgroundColor: theme.accentMuted },
              ]}
            >
              <Text
                style={{ color: theme.accent, fontSize: 10, fontWeight: "700" }}
              >
                RUNNING
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setTerminalOpen(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="terminal-close"
          >
            <Feather name="chevron-down" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.body}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          hideKeyboardAccessoryView={true}
          keyboardDisplayRequiresUserAction={false}
          style={{ flex: 1, backgroundColor: theme.terminalBg }}
          androidLayerType="hardware"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 340,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  title: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  runningPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 },
  iconBtn: { padding: 6 },
  body: { flex: 1 },
});
