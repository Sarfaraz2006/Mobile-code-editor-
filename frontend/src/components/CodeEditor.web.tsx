// Web fallback for the code editor. Uses an <iframe srcDoc=...> so we get the
// same CodeMirror UX in the web preview. The native platforms use the WebView
// version in `CodeEditor.tsx`.
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { detectLanguage } from "@/src/lib/themes";
import { useApp } from "@/src/context/AppContext";

interface Props {
  path: string;
  content: string;
  onChange: (content: string) => void;
}

function buildHtml(mode: string, isDark: boolean, initial: string) {
  const theme = isDark ? "material-darker" : "eclipse";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/material-darker.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/eclipse.min.css" />
<style>
  html, body { margin:0; padding:0; height:100%; background: ${isDark ? "#1E1E1E" : "#FFFFFF"}; }
  .CodeMirror { height:100%; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; line-height: 1.55; }
  .CodeMirror-gutters { border-right: 1px solid ${isDark ? "#2A2A2A" : "#E5E5E5"}; background: ${isDark ? "#181818" : "#F5F5F5"}; }
  .CodeMirror-linenumber { color: ${isDark ? "#5A5A5A" : "#A0A0A0"}; padding: 0 8px; }
  .CodeMirror-selected { background: ${isDark ? "#264F78" : "#ADD6FF"} !important; }
  .CodeMirror-activeline-background { background: ${isDark ? "#232323" : "#F0F0F0"} !important; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/jsx/jsx.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/yaml/yaml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/mode/simple.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/shell/shell.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/go/go.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/rust/rust.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/ruby/ruby.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/php/php.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/sql/sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/selection/active-line.min.js"></script>
</head>
<body>
<textarea id="code"></textarea>
<script>
  var post = function(msg){ parent.postMessage(msg, '*'); };
  var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    lineNumbers: true,
    mode: ${JSON.stringify(mode)},
    theme: ${JSON.stringify(theme)},
    indentUnit: 2,
    tabSize: 2,
    smartIndent: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    lineWrapping: true,
    spellcheck: false
  });
  editor.setValue(${JSON.stringify(initial)});
  var lastSent = ${JSON.stringify(initial)};
  editor.on('change', function(){
    var v = editor.getValue();
    if (v !== lastSent) { lastSent = v; post({ type: 'cc-change', value: v }); }
  });
  window.__setEditorValue = function(v){
    if (v !== editor.getValue()) {
      var cursor = editor.getCursor();
      lastSent = v;
      editor.setValue(v);
      editor.setCursor(cursor);
    }
  };
  window.__setEditorMode = function(m){ editor.setOption('mode', m); };
  post({ type: 'cc-ready' });
</script>
</body>
</html>`;
}

export default function CodeEditor({ path, content, onChange }: Props) {
  const { theme } = useApp();
  const isDark = theme.name === "dark";
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const lang = detectLanguage(path);

  const html = useMemo(
    () => buildHtml(lang.mode, isDark, content),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, isDark],
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
    if (!w) return;
    if (typeof w.__setEditorValue === "function") w.__setEditorValue(content);
  }, [content, path]);

  useEffect(() => {
    if (!readyRef.current) return;
    const w = iframeRef.current?.contentWindow as any;
    if (w && typeof w.__setEditorMode === "function") w.__setEditorMode(lang.mode);
  }, [lang.mode]);

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
