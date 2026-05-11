import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

function getWsUrl() {
  const token = localStorage.getItem('mchost_token');
  const base = `ws://${window.location.hostname}:3001/ws`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

let globalWs = null;
let reconnectTimer = null;
const subscribers = new Map(); // type+serverId -> Set<callback>
let serverListCallback = null;

function subscribe(key, cb) {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(cb);
  return () => {
    const set = subscribers.get(key);
    if (set) {
      set.delete(cb);
      if (set.size === 0) subscribers.delete(key);
    }
  };
}

function dispatch(key, data) {
  subscribers.get(key)?.forEach(cb => cb(data));
}

function connectGlobal(onServerListUpdate) {
  if (onServerListUpdate) serverListCallback = onServerListUpdate;
  if (globalWs && globalWs.readyState < 2) return;

  globalWs = new WebSocket(getWsUrl());

  globalWs.onopen = () => {
    console.log('WS connected');
    clearTimeout(reconnectTimer);
    // Re-subscribe to all active servers
    const seen = new Set();
    subscribers.forEach((_, key) => {
      if (key.startsWith('server:')) {
        const serverId = key.replace('server:', '').split(':')[0];
        if (!seen.has(serverId)) {
          seen.add(serverId);
          globalWs.send(JSON.stringify({ type: 'subscribe', serverId }));
        }
      }
    });
  };

  globalWs.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const { type, serverId, data } = msg;

      if (type === 'server_list') {
        serverListCallback?.(data);
        return;
      }

      if (serverId) {
        dispatch(`server:${serverId}:${type}`, data);
        dispatch(`server:${serverId}:*`, msg);
      }
    } catch (_) {}
  };

  globalWs.onclose = () => {
    console.log('WS disconnected, reconnecting in 3s...');
    reconnectTimer = setTimeout(() => connectGlobal(), 3000);
  };

  globalWs.onerror = () => {
    globalWs.close();
  };
}

export function useGlobalWS() {
  const updateServer = useStore(s => s.updateServer);

  useEffect(() => {
    connectGlobal((serverList) => {
      // Update all server statuses from the list broadcast
    });
  }, []);

  useEffect(() => {
    // Nothing to clean up globally
  }, [updateServer]);
}

export function useServerWS(serverId) {
  const updateServer = useStore(s => s.updateServer);
  const consoleRef = useRef([]);
  const listenersRef = useRef([]);

  useEffect(() => {
    if (!serverId) return;

    // Subscribe on the global socket
    const send = (msg) => {
      if (globalWs?.readyState === 1) {
        globalWs.send(JSON.stringify(msg));
      }
    };

    send({ type: 'subscribe', serverId });

    const unsubs = [
      subscribe(`server:${serverId}:init`, (data) => {
        consoleRef.current = data.console || [];
        updateServer(serverId, { status: data.status, players: data.players, stats: data.stats });
        dispatch(`server:${serverId}:console_history`, consoleRef.current);
      }),
      subscribe(`server:${serverId}:console`, (entry) => {
        consoleRef.current = [...consoleRef.current.slice(-1499), entry];
        dispatch(`server:${serverId}:console_line`, entry);
      }),
      subscribe(`server:${serverId}:status`, (data) => {
        updateServer(serverId, { status: data.status });
      }),
      subscribe(`server:${serverId}:stats`, (data) => {
        updateServer(serverId, { stats: data });
      }),
      subscribe(`server:${serverId}:players`, (data) => {
        updateServer(serverId, { players: data.players });
      }),
    ];

    listenersRef.current = unsubs;

    return () => {
      unsubs.forEach(fn => fn());
      send({ type: 'unsubscribe', serverId });
    };
  }, [serverId, updateServer]);

  const sendCommand = useCallback((command) => {
    if (globalWs?.readyState === 1) {
      globalWs.send(JSON.stringify({ type: 'command', serverId, command }));
    }
  }, [serverId]);

  const onConsoleLine = useCallback((cb) => {
    return subscribe(`server:${serverId}:console_line`, cb);
  }, [serverId]);

  const onConsoleHistory = useCallback((cb) => {
    return subscribe(`server:${serverId}:console_history`, cb);
  }, [serverId]);

  return { sendCommand, onConsoleLine, onConsoleHistory, consoleRef };
}

export { connectGlobal };
