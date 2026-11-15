import pino from "pino";

import { env } from "./env";

/**
 * Shared structured logger.
 *
 * - development: pretty colorized output (pino-pretty) for humans
 * - test:        single-line JSON at warn level — keeps test output readable
 *                and avoids pretty-transport worker threads under node --test
 * - production:  single-line JSON for log shippers
 */
const isDev = env.NODE_ENV === "development";

export const logger = pino({
    level: env.NODE_ENV === "test" ? "warn" : "info",
    ...(isDev
        ? {
              transport: {
                  target: "pino-pretty",
                  options: {
                      colorize: true,
                      translateTime: "SYS:HH:MM:SS.l",
                      ignore: "pid,hostname",
                  },
              },
          }
        : {}),
});
