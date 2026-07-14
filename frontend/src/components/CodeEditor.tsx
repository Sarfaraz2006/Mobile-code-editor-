import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { detectLanguage } from "@/src/lib/themes";
import { buildEditorHtml } from "@/src/lib/editorHtml";
import { useApp } from "@/src/context/AppContext";

interface Props {
  path: string;
  content: string;
  onChange: (content: string) => void;
}

export default function CodeEditor({ path, content, onChange }: Props) {
  const { theme, themeName, fontSize, fontFamily, editorAction } = useApp();
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const lang = detectLanguage(path);

  const html = useMemo(
    () =>
      buildEditorHtml({
        mode: lang.mode,
        themeName,
        initial: content,
        fontSize,
        fontFamily,
        kind: "native",
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, themeName, fontSize, fontFamily],
  );

  useEffect(() => {
    if (!readyRef.current) return;
    const escaped = JSON.stringify(content);
    webRef.current?.injectJavaScript(`window.setEditorValue(${escaped}); true;`);
  }, [content, path]);

  useEffect(() => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(
      `window.setEditorMode(${JSON.stringify(lang.mode)}); true;`,
    );
  }, [lang.mode]);

  useEffect(() => {
    if (!editorAction || !readyRef.current) return;
    if (editorAction.type === "action") {
      webRef.current?.injectJavaScript(
        `window.doAction(${JSON.stringify(editorAction.payload)}); true;`,
      );
    } else if (editorAction.type === "insert") {
      webRef.current?.injectJavaScript(
        `window.insertText(${JSON.stringify(editorAction.payload)}); true;`,
      );
    }
  }, [editorAction]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready") readyRef.current = true;
      else if (msg.type === "change") onChange(msg.value);
    } catch {}
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.editorBg }]}
      testID="code-editor-container"
    >
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        hideKeyboardAccessoryView={false}
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        scrollEnabled={false}
        style={{ flex: 1, backgroundColor: theme.editorBg }}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
