export function createBotControlDeliveryTracker({ enabled, now = () => new Date().toISOString() }) {
  let applied = null;

  return Object.freeze({
    record(revision) {
      const nextRevision = String(revision);
      if (applied && BigInt(nextRevision) < BigInt(applied.revision)) return applied;
      applied = { revision: nextRevision, acknowledgedAt: now() };
      return applied;
    },
    snapshot(currentRevision) {
      const current = String(currentRevision ?? '0');
      return {
        status: !enabled ? 'unconfigured' : applied?.revision === current ? 'applied' : 'pending',
        currentRevision: current,
        appliedRevision: applied?.revision ?? null,
        acknowledgedAt: applied?.acknowledgedAt ?? null
      };
    }
  });
}

export default createBotControlDeliveryTracker;
