export function createBotHeartbeatTracker({ enabled, staleAfterMs, now = Date.now }) {
  let lastHeartbeatAt = null;

  return Object.freeze({
    enabled,
    record() {
      lastHeartbeatAt = now();
      return lastHeartbeatAt;
    },
    snapshot() {
      if (!enabled) {
        return {
          status: 'unknown',
          reason: 'Bot heartbeat reporting is not configured.'
        };
      }

      if (lastHeartbeatAt === null) {
        return {
          status: 'offline',
          reason: 'No bot heartbeat has been received.'
        };
      }

      const isOnline = now() - lastHeartbeatAt <= staleAfterMs;
      return {
        status: isOnline ? 'online' : 'offline',
        lastHeartbeatAt: new Date(lastHeartbeatAt).toISOString(),
        ...(!isOnline ? { reason: 'The last bot heartbeat has expired.' } : {})
      };
    }
  });
}
