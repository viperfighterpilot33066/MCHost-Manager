import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';

// Dynamic import for xterm to avoid SSR issues
let termLib = null;

async function getXterm() {
  if (termLib) return termLib;
  const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
  ]);
  termLib = { Terminal, FitAddon, WebLinksAddon };
  return termLib;
}

export default function Console({ serverId, ws, isRunning }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const historyRef = useRef([]);
  const [command, setCommand] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef(null);
  // Initialize xterm — re-runs when serverId changes so switching servers gets a fresh terminal
  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    (async () => {
      const { Terminal, FitAddon, WebLinksAddon } = await getXterm();
      if (disposed) return;

      const term = new Terminal({
        theme: {
          background: '#0a0e13',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          cursorAccent: '#0d1117',
          selectionBackground: '#264f78',
          black: '#484f58',
          red: '#f85149',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#b1bac4',
          brightBlack: '#6e7681',
          brightRed: '#ff7b72',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#f0f6fc',
        },
        fontSize: 13,
        fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
        lineHeight: 1.4,
        cursorBlink: false,
        scrollback: 5000,
        convertEol: true,
        disableStdin: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const linksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(linksAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitRef.current = fitAddon;

      // Write buffered history
      historyRef.current.forEach(entry => writeEntry(term, entry));
      historyRef.current = [];

      term.writeln('\x1b[90m─── MCHost Manager Console ───\x1b[0m');
    })();

    return () => {
      disposed = true;
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
      historyRef.current = [];
    };
  }, [serverId]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      fitRef.current?.fit();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Subscribe to console events
  useEffect(() => {
    if (!ws) return;

    const unsubHistory = ws.onConsoleHistory((entries) => {
      const term = termRef.current;
      if (term) {
        term.clear();
        term.writeln('\x1b[90m─── MCHost Manager Console ───\x1b[0m');
        entries.forEach(e => writeEntry(term, e));
      } else {
        historyRef.current = entries;
      }
    });

    const unsubLine = ws.onConsoleLine((entry) => {
      const term = termRef.current;
      if (term) {
        writeEntry(term, entry);
      } else {
        historyRef.current.push(entry);
      }
    });

    return () => {
      unsubHistory();
      unsubLine();
    };
  }, [ws]);

  function writeEntry(term, entry) {
    if (!entry) return;
    const line = entry.line || '';
    // Minecraft uses § color codes — convert to ANSI
    const colored = mcColorToAnsi(line);
    term.writeln(colored);
  }

  function mcColorToAnsi(text) {
    const map = {
      '§0': '\x1b[30m', '§1': '\x1b[34m', '§2': '\x1b[32m', '§3': '\x1b[36m',
      '§4': '\x1b[31m', '§5': '\x1b[35m', '§6': '\x1b[33m', '§7': '\x1b[37m',
      '§8': '\x1b[90m', '§9': '\x1b[94m', '§a': '\x1b[92m', '§b': '\x1b[96m',
      '§c': '\x1b[91m', '§d': '\x1b[95m', '§e': '\x1b[93m', '§f': '\x1b[97m',
      '§l': '\x1b[1m', '§o': '\x1b[3m', '§n': '\x1b[4m', '§m': '\x1b[9m',
      '§r': '\x1b[0m',
    };
    return text.replace(/§[0-9a-fklmnor]/gi, m => map[m] || '');
  }

  const sendCommand = () => {
    const cmd = command.trim();
    if (!cmd) return;
    ws?.sendCommand(cmd);
    setCmdHistory(h => [cmd, ...h.slice(0, 49)]);
    setCommand('');
    setHistIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(idx);
      if (cmdHistory[idx]) setCommand(cmdHistory[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setCommand(idx === -1 ? '' : cmdHistory[idx] || '');
    }
  };

  const clearConsole = () => {
    termRef.current?.clear();
    termRef.current?.writeln('\x1b[90m─── Console cleared ───\x1b[0m');
  };

  return (
    <div className="console-wrapper" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: '#0a0e13' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <TerminalIcon size={12} />
          <span>Console</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={clearConsole} title="Clear console">
          <Trash2 size={12} />
        </button>
      </div>

      <div className="console-output" ref={containerRef} />

      <div className="console-input-row">
        <span className="console-prompt">{'>'}</span>
        <input
          ref={inputRef}
          className="console-input-field"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Send command...' : 'Server is not running'}
          disabled={!isRunning}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          className="btn btn-ghost btn-sm"
          onClick={sendCommand}
          disabled={!isRunning || !command.trim()}
          style={{ flexShrink: 0 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
