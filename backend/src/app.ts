import express from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";

import { env } from "@/config/env";
import { auth } from "@/auth";
import { profileRouter } from "@/routes/profile";
import { usersRouter } from "@/routes/users";
import { conversationsRouter } from "@/routes/conversations";
import { messagesRouter } from "@/routes/messages";

export const app = express();

// 1. Security headers and CORS
app.use(helmet());
app.use(
    cors({
        origin: env.FRONTEND_URL,
        credentials: true,
    })
);

// 2. Better Auth mounted BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

// 3. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/profile", profileRouter);
app.use("/api/users", usersRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/conversations/:conversationId/messages", messagesRouter)

// 4. Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// 5. Global error handling

app.use((err: unknown, req: express.Request, res: express.Response,
    next: express.NextFunction) => {
    console.error("Unhandled Error", err);
    res.status(500).json({
        error: "Internal server error",
    });
});