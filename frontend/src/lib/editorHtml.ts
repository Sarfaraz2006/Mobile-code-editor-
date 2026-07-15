// Shared HTML builder for the CodeMirror editor used in both native (WebView)
// and web (iframe). Keeping it in one place means both platforms get the
// same feature set (themes, addons, actions).
import { FONT_FAMILIES, FontFamilyKey, themes, ThemeName } from "@/src/lib/themes";

// Themes that need their CSS file loaded from the CDN. Extend when adding
// new themes.
const CM_THEME_CSS: Record<string, string> = {
  "material-darker": "material-darker",
  eclipse: "eclipse",
  monokai: "monokai",
  dracula: "dracula",
  nord: "nord",
  "solarized dark": "solarized",
  "solarized light": "solarized",
  "ayu-dark": "ayu-dark",
};

export function buildEditorHtml(
  opts: {
    mode: string;
    themeName: ThemeName;
    initial: string;
    fontSize: number;
    fontFamily: FontFamilyKey;
    kind: "native" | "web";
  },
) {
  const theme = themes[opts.themeName];
  const cm = theme.cmTheme;
  const themeFile = CM_THEME_CSS[cm] || "material-darker";
  const font = FONT_FAMILIES[opts.fontFamily].css;

  const post =
    opts.kind === "native"
      ? `function post(msg){ if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } }`
      : `function post(msg){ parent.postMessage(msg, '*'); }`;

  const readyMsg = opts.kind === "native" ? "'ready'" : "'cc-ready'";
  const changeMsg = opts.kind === "native" ? "'change'" : "'cc-change'";
  const globalPrefix = opts.kind === "native" ? "" : "__";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/${themeFile}.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/dialog/dialog.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/foldgutter.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.min.css" />
<style>
  html, body { margin:0; padding:0; height:100%; background: ${theme.editorBg}; }
  .CodeMirror {
    height:100%;
    font-family: ${font};
    font-size: ${opts.fontSize}px;
    line-height: 1.55;
  }
  .CodeMirror-gutters { border-right: 1px solid ${theme.border}; background: ${theme.surface}; }
  .CodeMirror-linenumber { color: ${theme.textSecondary}; padding: 0 8px; opacity: 0.7; }
  .CodeMirror-selected { background: ${theme.accentMuted} !important; }
  .CodeMirror-focused .CodeMirror-selected { background: ${theme.accentMuted} !important; }
  .CodeMirror-activeline-background { background: ${theme.surfaceActive} !important; opacity: .6; }
  .CodeMirror-matchingbracket { color: ${theme.warning} !important; text-decoration: underline; }
  .CodeMirror-foldmarker { color: ${theme.accent}; text-shadow: none; font-family: monospace; }
  .CodeMirror-cursor { border-left: 2px solid ${theme.accent} !important; }
  .CodeMirror-hints { z-index: 999999; font-family: ${font}; font-size: 13px; }
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/xml-fold.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchtags.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/trailingspace.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/selection/active-line.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/selection/mark-selection.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/dialog/dialog.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/searchcursor.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/search.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/jump-to-line.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/match-highlighter.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/foldcode.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/foldgutter.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/brace-fold.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/indent-fold.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/fold/comment-fold.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/comment/comment.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/anyword-hint.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/javascript-hint.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/html-hint.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/css-hint.min.js"></script>
</head>
<body>
<textarea id="code"></textarea>
<script>
  ${post}
  var PY_KEYWORDS = ["and","as","assert","async","await","break","class","continue","def","del","elif","else","except","False","finally","for","from","global","if","import","in","is","lambda","None","nonlocal","not","or","pass","raise","return","True","try","while","with","yield","print","len","range","str","int","float","list","dict","set","tuple","open","input","enumerate","zip","map","filter","sorted","reversed","min","max","sum","abs","any","all","type","isinstance"];
  function completeAnyword(cm) {
    var cur = cm.getCursor(), token = cm.getTokenAt(cur);
    var word = /^[a-zA-Z_]\\w*/;
    var start = token.start, end = cur.ch;
    var current = token.string;
    var m = current.match(word);
    if (!m) { start = end; current = ""; }
    var lang = cm.getOption('mode');
    var seen = {}, list = [];
    var re = /[a-zA-Z_][\\w]{2,}/g, text = cm.getValue();
    var found;
    while ((found = re.exec(text))) {
      if (!seen[found[0]] && found[0] !== current) { seen[found[0]] = 1; list.push(found[0]); }
    }
    if (String(lang).indexOf('python') !== -1) {
      for (var i = 0; i < PY_KEYWORDS.length; i++) if (!seen[PY_KEYWORDS[i]]) { seen[PY_KEYWORDS[i]] = 1; list.push(PY_KEYWORDS[i]); }
    }
    list = list.filter(function(w){ return !current || w.toLowerCase().indexOf(current.toLowerCase()) === 0; });
    list.sort();
    return { list: list.slice(0, 50), from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end) };
  }
  CodeMirror.registerHelper('hint', 'anyword', completeAnyword);

  var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    lineNumbers: true,
    mode: ${JSON.stringify(opts.mode)},
    theme: ${JSON.stringify(cm)},
    indentUnit: 2, tabSize: 2, smartIndent: true,
    matchBrackets: true, autoCloseBrackets: true, matchTags: {bothTags: true},
    styleActiveLine: true, lineWrapping: true, styleSelectedText: true,
    foldGutter: true, gutters: ["CodeMirror-linenumbers","CodeMirror-foldgutter"],
    highlightSelectionMatches: {showToken: /\\w/, annotateScrollbar: false},
    inputStyle: 'contenteditable',
    showTrailingSpace: true,
    spellcheck: false, autocorrect: false, autocapitalize: false,
    extraKeys: {
      "Ctrl-Space": function(cm){ cm.showHint({hint: completeAnyword, completeSingle: false}); },
    }
  });
  editor.setValue(${JSON.stringify(opts.initial)});
  var lastSent = ${JSON.stringify(opts.initial)};
  editor.on('change', function(){
    var v = editor.getValue();
    if (v !== lastSent) { lastSent = v; post({ type: ${changeMsg}, value: v }); }
  });
  window.__editor = editor;
  window.${globalPrefix}setEditorValue = function(v){ if (v !== editor.getValue()) { var c = editor.getCursor(); lastSent = v; editor.setValue(v); editor.setCursor(c); } };
  window.${globalPrefix}setEditorMode = function(m){ editor.setOption('mode', m); };
  window.${globalPrefix}doAction = function(action){
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
    else if (action === 'autocomplete') editor.showHint({hint: completeAnyword, completeSingle: false});
    else if (action === 'addCursorBelow') {
      var sels = editor.listSelections();
      var newSels = sels.slice();
      sels.forEach(function(s){
        var line = s.head.line + 1;
        if (line < editor.lineCount()) {
          newSels.push({ anchor: {line: line, ch: s.anchor.ch}, head: {line: line, ch: s.head.ch} });
        }
      });
      editor.setSelections(newSels);
    }
    else if (action === 'addCursorAbove') {
      var sels = editor.listSelections();
      var newSels = sels.slice();
      sels.forEach(function(s){
        var line = s.head.line - 1;
        if (line >= 0) {
          newSels.push({ anchor: {line: line, ch: s.anchor.ch}, head: {line: line, ch: s.head.ch} });
        }
      });
      editor.setSelections(newSels);
    }
    else if (action === 'addCursorNextOccurrence') {
      var sel = editor.getSelection();
      if (!sel) return;
      var cur = editor.getSearchCursor(sel, editor.getCursor('to'));
      if (cur.findNext()) {
        var sels = editor.listSelections();
        sels.push({ anchor: cur.from(), head: cur.to() });
        editor.setSelections(sels);
      }
    }
  };
  window.${globalPrefix}insertText = function(t){ editor.replaceSelection(t); editor.focus(); };
  post({ type: ${readyMsg} });
</script>
</body>
</html>`;
}
