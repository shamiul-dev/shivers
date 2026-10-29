type Rule = { max: number; windowMs: number };

export function createSocketRateLimit(events: Record<string, Rule>) {
    const buckets = new Map<string, { tokens: number; last: number }>();

    function check(socketId: string, eventName: string): boolean {
        const rule = events[eventName];
        if (!rule) return true;

        const key = `${socketId}:${eventName}`;
        const now = Date.now();
        const bucket = buckets.get(key) ?? { tokens: rule.max, last: now };
        const refilled = Math.min(
            rule.max,
            bucket.tokens + ((now - bucket.last) / rule.windowMs) * rule.max
        );

        if (refilled < 1) {
            buckets.set(key, { tokens: refilled, last: now });
            return false;
        }

        buckets.set(key, { tokens: refilled - 1, last: now });
        return true;
    }

    function clear(socketId: string) {
        for (const eventName of Object.keys(events)) {
            buckets.delete(`${socketId}:${eventName}`);
        }
    }

    return { check, clear };
}