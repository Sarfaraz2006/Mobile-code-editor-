import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
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
        kind: "web",
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, themeName, fontSize, fontFamily],
  );

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "cc-ready") readyRef.current = true;
      if (data.type === "cc-change") onChange(data.value);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onChange]);

  useEffect(() => {
    if (!readyRef.current) return;
    const w = iframeRef.current?.contentWindow as any;
    if (w && typeof w.__setEditorValue === "function") w.__setEditorValue(content);
  }, [content, path]);

  useEffect(() => {
    if (!readyRef.current) return;
    const w = iframeRef.current?.contentWindow as any;
    if (w && typeof w.__setEditorMode === "function") w.__setEditorMode(lang.mode);
  }, [lang.mode]);

  useEffect(() => {
    if (!editorAction || !readyRef.current) return;
    const w = iframeRef.current?.contentWindow as any;
    if (!w) return;
    if (editorAction.type === "action" && typeof w.__doAction === "function") {
      w.__doAction(editorAction.payload);
    } else if (editorAction.type === "insert" && typeof w.__insertText === "function") {
      w.__insertText(editorAction.payload);
    }
  }, [editorAction]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.editorBg }]}
      testID="code-editor-container"
    >
      <iframe
        ref={iframeRef}
        title="code-editor"
        srcDoc={html}
        style={{
          border: "none",
          width: "100%",
          height: "100%",
          background: theme.editorBg,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
