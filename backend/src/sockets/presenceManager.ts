/**
 * Multi-Tab Presence Manager
 * Tracks active socket connections per user in memory.
 * Emits online/offline transitions only when connection count shifts 0 <-> 1.
 */

class PresenceManager {
    private userSockets = new Map<string, Set<string>>();

    trackConnection(userId: string, socketId: string): { isFirstConnection: boolean } {
        let sockets = this.userSockets.get(userId);
        if (!sockets) {
            sockets = new Set<string>();
            this.userSockets.set(userId, sockets);
        }

        const isFirstConnection = sockets.size === 0;
        sockets.add(socketId);
        return { isFirstConnection };
    }

    untrackConnection(userId: string, socketId: string): { isLastConnection: boolean } {
        const sockets = this.userSockets.get(userId);
        if (!sockets) return { isLastConnection: false };

        sockets.delete(socketId);
        if (sockets.size === 0) {
            this.userSockets.delete(userId);
            return { isLastConnection: true };
        }
        return { isLastConnection: false };
    }

    isOnline(userId: string): boolean {
        const sockets = this.userSockets.get(userId);
        return Boolean(sockets && sockets.size > 0);
    }

    getOnlineUserIds(userIds: string[]): string[] {
        return userIds.filter((id) => this.isOnline(id));
    }
}

export const presenceManager = new PresenceManager();

