import { createServer } from "node:http";
import { app } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { createSocketServer } from "@/sockets";

const server = createServer(app);
createSocketServer(server);

server.listen(env.PORT, () => {
    logger.info(`🚀 Shivers backend running on http://localhost:${env.PORT}`);
    logger.info(`📡 Health check available at http://localhost:${env.PORT}/health`);
});