import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Trash2, HelpCircle, X } from 'lucide-react';

const COMMAND_HELP = [
  {
    category: 'Player Management',
    commands: [
      { cmd: 'op <player>', desc: 'Give operator status' },
      { cmd: 'deop <player>', desc: 'Remove operator status' },
      { cmd: 'kick <player> [reason]', desc: 'Kick a player' },
      { cmd: 'ban <player> [reason]', desc: 'Ban a player' },
      { cmd: 'pardon <player>', desc: 'Unban a player' },
      { cmd: 'ban-ip <ip>', desc: 'Ban an IP address' },
      { cmd: 'whitelist add <player>', desc: 'Add to whitelist' },
      { cmd: 'whitelist remove <player>', desc: 'Remove from whitelist' },
      { cmd: 'whitelist list', desc: 'Show whitelisted players' },
      { cmd: 'whitelist on / off', desc: 'Enable or disable whitelist' },
    ],
  },
  {
    category: 'World & Gameplay',
    commands: [
      { cmd: 'time set day', desc: 'Set time to day' },
      { cmd: 'time set night', desc: 'Set time to night' },
      { cmd: 'weather clear', desc: 'Clear weather' },
      { cmd: 'weather rain', desc: 'Start rain' },
      { cmd: 'tp <player1> <player2>', desc: 'Teleport player to player' },
      { cmd: 'give <player> <item> [count]', desc: 'Give item to player' },
      { cmd: 'gamemode <mode> [player]', desc: 'survival / creative / adventure / spectator' },
      { cmd: 'difficulty <level>', desc: 'peaceful / easy / normal / hard' },
      { cmd: 'gamerule <rule> <value>', desc: 'Change a game rule' },
      { cmd: 'fill <x1 y1 z1> <x2 y2 z2> <block>', desc: 'Fill area with blocks' },
    ],
  },
  {
    category: 'Server Management',
    commands: [
      { cmd: 'list', desc: 'Show online players' },
      { cmd: 'say <message>', desc: 'Broadcast message to all' },
      { cmd: 'save-all', desc: 'Force save the world' },
      { cmd: 'save-off / save-on', desc: 'Disable / enable auto-save' },
      { cmd: 'reload', desc: 'Reload datapacks' },
      { cmd: 'stop', desc: 'Stop the server gracefully' },
      { cmd: 'seed', desc: 'Show world seed' },
      { cmd: 'defaultgamemode <mode>', desc: 'Set default gamemode for new players' },
      { cmd: 'scoreboard', desc: 'Manage scoreboards' },
    ],
  },
  {
    category: 'Paper / Performance',
    commands: [
      { cmd: 'tps', desc: 'Show server TPS (Paper only)' },
      { cmd: 'gc', desc: 'Run garbage collection (Paper)' },
      { cmd: 'timings report', desc: 'Generate timing report (Paper)' },
      { cmd: 'chunky start', desc: 'Pre-generate chunks (Chunky plugin)' },
      { cmd: 'pl', desc: 'List installed plugins' },
      { cmd: 'version', desc: 'Show server version' },
    ],
  },
];

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
  const [showHelp, setShowHelp] = useState(false);
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
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`btn btn-icon btn-sm ${showHelp ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowHelp(h => !h)}
            title="Command reference"
          >
            {showHelp ? <X size={12} /> : <HelpCircle size={12} />}
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={clearConsole} title="Clear console">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Command help panel */}
      {showHelp && (
        <div style={{ overflowY: 'auto', maxHeight: 240, background: '#0d1117', borderBottom: '1px solid var(--border)', padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {COMMAND_HELP.map(group => (
              <div key={group.category}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {group.category}
                </div>
                {group.commands.map(({ cmd, desc }) => (
                  <div
                    key={cmd}
                    onClick={() => { setCommand(cmd.split(' ')[0] + ' '); inputRef.current?.focus(); }}
                    style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 0', cursor: 'pointer', borderRadius: 3 }}
                    title="Click to prefill"
                  >
                    <code style={{ fontSize: 11, color: 'var(--success)', whiteSpace: 'nowrap', flexShrink: 0 }}>{cmd}</code>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            Click any command to prefill · ↑↓ arrow keys for history · /help in-game for full list
          </div>
        </div>
      )}

      <div className="console-output" ref={containerRef} />

      <div className="console-input-row">
        <span className="console-prompt">{'>'}</span>
        <input
          ref={inputRef}
          className="console-input-field"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Send command... (? for help)' : 'Server is not running'}
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
