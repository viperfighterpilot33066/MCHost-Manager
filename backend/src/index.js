const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { ServerManager } = require('./serverManager');
const { initScheduler } = require('./services/schedulerService');
const { router: authRouter, bearerAuth } = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const serverManager = new ServerManager();
app.locals.serverManager = serverManager;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Auth routes (no bearer required)
app.use('/api/auth', authRouter);

// All other API routes require bearer token if password is set
app.use('/api', bearerAuth);

// Routes
app.use('/api/servers', require('./routes/servers'));
app.use('/api/plugins', require('./routes/plugins'));
app.use('/api/backups', require('./routes/backups'));
app.use('/api/versions', require('./routes/versions'));
app.use('/api/network', require('./routes/network'));

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// WebSocket
wss.on('connection', (ws, req) => {
  console.log(`WS connected: ${req.socket.remoteAddress}`);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, serverId, command } = msg;

      if (type === 'subscribe' && serverId) {
        serverManager.subscribeClient(serverId, ws);
      } else if (type === 'unsubscribe' && serverId) {
        serverManager.unsubscribeClient(serverId, ws);
      } else if (type === 'command' && serverId && command) {
        const srv = serverManager.getServer(serverId);
        if (srv) srv.sendCommand(command);
      } else if (type === 'subscribe_all') {
        serverManager.getAllServers().forEach(s => serverManager.subscribeClient(s.id, ws));
      } else if (type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (err) {
      console.error('WS message parse error:', err.message);
    }
  });

  ws.on('close', () => serverManager.unsubscribeClientAll(ws));
  ws.on('error', (err) => {
    console.error('WS error:', err.message);
    serverManager.unsubscribeClientAll(ws);
  });

  // Send initial server list
  ws.send(JSON.stringify({ type: 'server_list', data: serverManager.getAllServers() }));
});

// Broadcast server list on any status change (for dashboard)
serverManager.on = serverManager.on || (() => {});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  await serverManager.initialize();
  initScheduler(serverManager);
  console.log(`MCHost Manager backend running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  for (const srv of serverManager.servers.values()) {
    if (srv.status !== 'stopped') await srv.kill().catch(() => {});
  }
  process.exit(0);
});
