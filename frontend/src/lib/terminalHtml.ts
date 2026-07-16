import { Theme } from "@/src/lib/themes";

export function buildTerminalHtml(opts: {
  theme: Theme;
  backendUrl: string;
  sessionId: string;
}) {
  // Convert http/https backend URL to ws/wss
  let wsUrl = opts.backendUrl ? opts.backendUrl.replace(/^http/, "ws") : "";
  if (wsUrl) {
    if (wsUrl.endsWith("/")) {
      wsUrl = wsUrl.slice(0, -1);
    }
    // Append terminal websocket path
    wsUrl = `${wsUrl}/api/terminal/ws/${opts.sessionId}`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/xterm@5.3.0/css/xterm.css" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: ${opts.theme.terminalBg || opts.theme.bg};
      overflow: hidden;
    }
    #terminal-container {
      width: 100%;
      height: 100%;
      padding: 6px;
      box-sizing: border-box;
    }
    /* Hide scrollbar */
    .xterm-viewport::-webkit-scrollbar {
      display: none;
    }
  </style>
  <script src="https://unpkg.com/xterm@5.3.0/lib/xterm.js"></script>
  <script src="https://unpkg.com/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
  <script src="https://unpkg.com/xterm-addon-web-links@0.9.0/lib/xterm-addon-web-links.js"></script>
</head>
<body>
  <div id="terminal-container"></div>
  <script>
    const term = new Terminal({
      theme: {
        background: '${opts.theme.terminalBg || opts.theme.bg}',
        foreground: '${opts.theme.textPrimary}',
        cursor: '${opts.theme.accent}',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2'
      },
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'monospace',
      allowProposedApi: true
    });
    
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon.WebLinksAddon());
    
    term.open(document.getElementById('terminal-container'));
    fitAddon.fit();
    
    let ws;
    let localMode = false;
    let currentLine = '';
    const isReactNative = !!(window.ReactNativeWebView);

    window.writeTerminalData = (data) => {
      term.write(data);
    };

    const prompt = () => term.write('\\r\\nlocal-shell$ ');

    function runLocalCommand(cmd) {
      const parts = cmd.split(' ');
      const base = parts[0];
      if (base === 'help') {
        term.write('Available local commands:\\r\\n');
        term.write('  help   - Show this help message\\r\\n');
        term.write('  clear  - Clear terminal screen\\r\\n');
        term.write('  echo   - Print arguments\\r\\n');
        term.write('  node   - Execute a JS statement (e.g. node 1+1)\\r\\n');
        term.write('  uname  - Print system info\\r\\n');
      } else if (base === 'clear') {
        term.clear();
      } else if (base === 'echo') {
        term.write(parts.slice(1).join(' ') + '\\r\\n');
      } else if (base === 'uname') {
        term.write('Android Linux Shell (CodeCraft JS Virtual Sandbox)\\r\\n');
      } else if (base === 'node') {
        const code = parts.slice(1).join(' ');
        try {
          const result = eval(code);
          term.write(String(result) + '\\r\\n');
        } catch(e) {
          term.write('Error: ' + e.message + '\\r\\n');
        }
      } else {
        term.write('command not found: ' + base + '\\r\\n');
      }
      prompt();
    }

    function startLocalShell() {
      if (localMode) return;
      localMode = true;
      term.write('\\r\\n*** Welcome to CodeCraft Local Shell Sandbox ***\\r\\n');
      term.write('Running serverless on Android device.\\r\\n');
      prompt();
    }

    function connect() {
      if (isReactNative) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        return;
      }
      const wsUrl = "${wsUrl}";
      if (!wsUrl) {
        startLocalShell();
        return;
      }
      
      term.write('\\r\\nConnecting to terminal server...\\r\\n');
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        term.write('\\r\\n*** Connected to shell ***\\r\\n\\r');
        
        // Wait a small timeout to allow layout to settle before sending dimensions
        setTimeout(() => {
          try {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) {
              ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
          } catch(e) {}
        }, 100);
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'data') {
            term.write(msg.data);
          } else if (msg.type === 'exit') {
            term.write('\\r\\n*** Shell process exited ***\\r\\n');
          }
        } catch (e) {
          term.write(event.data);
        }
      };
      
      ws.onclose = () => {
        term.write('\\r\\n*** Connection failed/closed. Falling back to local shell... ***\\r\\n');
        startLocalShell();
      };
      
      ws.onerror = (err) => {
        term.write('\\r\\n*** WebSocket error ***\\r\\n');
      };
    }
    
    term.onData(data => {
      if (isReactNative) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'input', data }));
        return;
      }
      if (localMode) {
        for (let i = 0; i < data.length; i++) {
          const char = data[i];
          if (char === '\\r') {
            term.write('\\r\\n');
            const cmd = currentLine.trim();
            if (cmd) {
              runLocalCommand(cmd);
            } else {
              prompt();
            }
            currentLine = '';
          } else if (char === '\\u007F') { // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              term.write('\\b \\b');
            }
          } else if (char >= ' ' && char <= '~') {
            currentLine += char;
            term.write(char);
          }
        }
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });
    
    window.addEventListener('resize', () => {
      try {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      } catch (e) {}
    });
    
    // Fit terminal layout initially after load
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch(e){}
    }, 100);

    connect();
  </script>
</body>
</html>`;
}
