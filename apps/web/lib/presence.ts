// In-process presence tracking: "online" means the visitor currently has an open SSE
// connection to /api/widget/events for this conversation (their widget tab is open and
// they've sent at least one message). globalThis-cached to survive Next dev HMR, mirroring
// the conversationEvents singleton.
type PresenceState = { openConnections: number; lastSeenAt: Date | null };

const g = globalThis as unknown as { momoPresence?: Map<string, PresenceState> };
const presence = g.momoPresence ?? new Map<string, PresenceState>();
if (process.env.NODE_ENV !== "production") g.momoPresence = presence;

export function markConnected(conversationId: string) {
  const state = presence.get(conversationId) ?? { openConnections: 0, lastSeenAt: null };
  state.openConnections += 1;
  presence.set(conversationId, state);
}

export function markDisconnected(conversationId: string) {
  const state = presence.get(conversationId);
  if (!state) return;
  state.openConnections = Math.max(0, state.openConnections - 1);
  if (state.openConnections === 0) state.lastSeenAt = new Date();
  presence.set(conversationId, state);
}

export function touchLastSeen(conversationId: string) {
  const state = presence.get(conversationId) ?? { openConnections: 0, lastSeenAt: null };
  state.lastSeenAt = new Date();
  presence.set(conversationId, state);
}

export function getPresence(conversationId: string): { online: boolean; lastSeenAt: string | null } {
  const state = presence.get(conversationId);
  if (!state) return { online: false, lastSeenAt: null };
  return { online: state.openConnections > 0, lastSeenAt: state.lastSeenAt?.toISOString() ?? null };
}
