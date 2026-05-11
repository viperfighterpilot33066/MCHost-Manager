const cron = require('node-cron');

const activeTasks = new Map(); // serverId -> cron.ScheduledTask[]

function initScheduler(serverManager) {
  // Re-register schedules for all existing servers
  for (const srv of serverManager.servers.values()) {
    if (srv.scheduledRestarts?.length > 0) {
      registerSchedules(srv);
    }
  }
}

function registerSchedules(server) {
  // Clear existing tasks for this server
  const existing = activeTasks.get(server.id) || [];
  existing.forEach(t => t.stop());
  activeTasks.set(server.id, []);

  if (!server.scheduledRestarts || server.scheduledRestarts.length === 0) return;

  const tasks = [];
  for (const schedule of server.scheduledRestarts) {
    if (!schedule.cron || !schedule.enabled) continue;
    if (!cron.validate(schedule.cron)) continue;

    const task = cron.schedule(schedule.cron, async () => {
      if (server.status === 'running') {
        server._addLog(`[SCHEDULER] Scheduled restart triggered (${schedule.cron})`);
        try {
          await server.restart();
        } catch (err) {
          server._addLog(`[SCHEDULER] Restart failed: ${err.message}`);
        }
      }
    }, { timezone: schedule.timezone || 'UTC' });

    tasks.push(task);
  }

  activeTasks.set(server.id, tasks);
}

function unregisterSchedules(serverId) {
  const tasks = activeTasks.get(serverId) || [];
  tasks.forEach(t => t.stop());
  activeTasks.delete(serverId);
}

module.exports = { initScheduler, registerSchedules, unregisterSchedules };
