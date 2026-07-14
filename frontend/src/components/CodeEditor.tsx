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

function buildHtml(mode: string, isDark: boolean, initial: string, fontSize: number) {
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
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/foldgutter.min.css" />
<style>
  html, body { margin:0; padding:0; height:100%; background: ${isDark ? "#1E1E1E" : "#FFFFFF"}; }
  .CodeMirror { height:100%; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: ${fontSize}px; line-height: 1.55; }
  .CodeMirror-gutters { border-right: 1px solid ${isDark ? "#2A2A2A" : "#E5E5E5"}; background: ${isDark ? "#181818" : "#F5F5F5"}; }
  .CodeMirror-linenumber { color: ${isDark ? "#5A5A5A" : "#A0A0A0"}; padding: 0 8px; }
  .CodeMirror-selected { background: ${isDark ? "#264F78" : "#ADD6FF"} !important; }
  .CodeMirror-focused .CodeMirror-selected { background: ${isDark ? "#264F78" : "#ADD6FF"} !important; }
  .CodeMirror-activeline-background { background: ${isDark ? "#232323" : "#F0F0F0"} !important; }
  .CodeMirror-matchingbracket { color: ${isDark ? "#FFD700" : "#0000FF"} !important; text-decoration: underline; }
  .CodeMirror-foldmarker { color: ${isDark ? "#569CD6" : "#0000FF"}; text-shadow: none; font-family: monospace; }
  .CodeMirror-foldgutter, .CodeMirror-foldgutter-open, .CodeMirror-foldgutter-folded { color: ${isDark ? "#7A7A7A" : "#999"}; }
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/dialog/dialog.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/searchcursor.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/search.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/jump-to-line.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/foldcode.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/foldgutter.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/brace-fold.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/indent-fold.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/comment/comment.min.js"></script>
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
    indentUnit: 2, tabSize: 2, smartIndent: true,
    matchBrackets: true, autoCloseBrackets: true,
    styleActiveLine: true, lineWrapping: true,
    foldGutter: true, gutters: ["CodeMirror-linenumbers","CodeMirror-foldgutter"],
    inputStyle: 'contenteditable',
    spellcheck: false, autocorrect: false, autocapitalize: false
  });
  editor.setValue(${JSON.stringify(initial)});
  var lastSent = ${JSON.stringify(initial)};
  editor.on('change', function(){
    var v = editor.getValue();
    if (v !== lastSent) { lastSent = v; post({ type: 'change', value: v }); }
  });
  window.__editor = editor;
  window.setEditorValue = function(v){ if (v !== editor.getValue()) { var c = editor.getCursor(); lastSent = v; editor.setValue(v); editor.setCursor(c); } };
  window.setEditorMode = function(m){ editor.setOption('mode', m); };
  window.doAction = function(action){
    if (action === 'find') editor.execCommand('find');
    else if (action === 'replace') editor.execCommand('replace');
    else if (action === 'jumpToLine') editor.execCommand('jumpToLine');
    else if (action === 'foldAll') editor.execCommand('foldAll');
    else if (action === 'unfoldAll') editor.execCommand('unfoldAll');
    else if (action === 'commentLine') editor.toggleComment();
    else if (action === 'selectAll') editor.execCommand('selectAll');
    else if (action === 'undo') editor.execCommand('undo');
    else if (action === 'redo') editor.execCommand('redo');
    else if (action === 'insertTab') editor.replaceSelection('  ');
  };
  window.insertText = function(t){ editor.replaceSelection(t); editor.focus(); };
  post({ type: 'ready' });
</script>
</body>
</html>`;
}

export default function CodeEditor({ path, content, onChange }: Props) {
  const { theme, fontSize, editorAction } = useApp();
  const isDark = theme.name === "dark";
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const lang = detectLanguage(path);
  const html = useMemo(
    () => buildHtml(lang.mode, isDark, content, fontSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, isDark, fontSize],
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
