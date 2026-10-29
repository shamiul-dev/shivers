import { createServer } from "node:http";
import { app } from "@/app";
import { env } from "@/config/env";
import { createSocketServer } from "@/sockets";

const server = createServer(app);
createSocketServer(server);

server.listen(env.PORT, () => {
    console.log(`🚀 Shivers backend running on http://localhost:${env.PORT}`);
    console.log(`📡 Health check available at http://localhost:${env.PORT}/health`);
});