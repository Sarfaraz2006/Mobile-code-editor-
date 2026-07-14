import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { detectLanguage } from "@/src/lib/themes";
import { useApp } from "@/src/context/AppContext";

interface Props {
  path: string;
  content: string;
  onChange: (content: string) => void;
}

/**
 * Build the CodeMirror 5 HTML document injected into the WebView.
 * We use CodeMirror 5 because it has strong mobile keyboard support and a
 * huge collection of language modes shipped as separate files.
 */
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
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/dialog/dialog.min.css" />
<style>
  html, body { margin:0; padding:0; height:100%; background: ${isDark ? "#1E1E1E" : "#FFFFFF"}; }
  .CodeMirror { height:100%; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; line-height: 1.55; }
  .CodeMirror-gutters { border-right: 1px solid ${isDark ? "#2A2A2A" : "#E5E5E5"}; background: ${isDark ? "#181818" : "#F5F5F5"}; }
  .CodeMirror-linenumber { color: ${isDark ? "#5A5A5A" : "#A0A0A0"}; padding: 0 8px; }
  .cm-s-material-darker.CodeMirror { background: #1E1E1E; color: #E6E6E6; }
  .cm-s-eclipse.CodeMirror { background: #FFFFFF; color: #111111; }
  .CodeMirror-scroll { overflow-x: auto; }
  .CodeMirror-selected { background: ${isDark ? "#264F78" : "#ADD6FF"} !important; }
  .CodeMirror-focused .CodeMirror-selected { background: ${isDark ? "#264F78" : "#ADD6FF"} !important; }
  .CodeMirror-activeline-background { background: ${isDark ? "#232323" : "#F0F0F0"} !important; }
  .CodeMirror-matchingbracket { color: ${isDark ? "#FFD700" : "#0000FF"} !important; text-decoration: underline; }
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/dialog/dialog.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/searchcursor.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/search.min.js"></script>
</head>
<body>
<textarea id="code"></textarea>
<script>
  var post = function(msg){
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  };
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
    inputStyle: 'contenteditable',
    spellcheck: false,
    autocorrect: false,
    autocapitalize: false
  });
  editor.setValue(${JSON.stringify(initial)});
  var lastSent = ${JSON.stringify(initial)};
  editor.on('change', function(){
    var v = editor.getValue();
    if (v !== lastSent) { lastSent = v; post({ type: 'change', value: v }); }
  });
  window.setEditorValue = function(v){
    if (v !== editor.getValue()) {
      var cursor = editor.getCursor();
      lastSent = v;
      editor.setValue(v);
      editor.setCursor(cursor);
    }
  };
  window.setEditorMode = function(m){ editor.setOption('mode', m); };
  window.setEditorTheme = function(t){ editor.setOption('theme', t); };
  window.findInEditor = function(){ editor.execCommand('find'); };
  window.replaceInEditor = function(){ editor.execCommand('replace'); };
  post({ type: 'ready' });
</script>
</body>
</html>`;
}

export default function CodeEditor({ path, content, onChange }: Props) {
  const { theme } = useApp();
  const isDark = theme.name === "dark";
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const lastSentPathRef = useRef<string>("");

  const lang = detectLanguage(path);
  const html = useMemo(
    () => buildHtml(lang.mode, isDark, content),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, isDark], // only rebuild when path/theme changes
  );

  // Push external content changes into the WebView (e.g. after switching tabs).
  useEffect(() => {
    if (!readyRef.current) return;
    if (lastSentPathRef.current !== path) {
      // path change: rebuild handles content; but if same html, ensure value updated
      lastSentPathRef.current = path;
    }
    const escaped = JSON.stringify(content);
    webRef.current?.injectJavaScript(`window.setEditorValue(${escaped}); true;`);
  }, [content, path]);

  // Update mode when language changes on same webview
  useEffect(() => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(
      `window.setEditorMode(${JSON.stringify(lang.mode)}); true;`,
    );
  }, [lang.mode]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready") {
        readyRef.current = true;
      } else if (msg.type === "change") {
        onChange(msg.value);
      }
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
