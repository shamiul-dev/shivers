import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/auth";
import { logger } from "@/config/logger";

//Extract Better Auth inferred session and user types
type sessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export interface AuthenticatedRequest extends Request{
    user: sessionData["user"];
    session: sessionData["session"];   
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try{
        const sessionData = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if(!sessionData || !sessionData.session || !sessionData.user) {
            res.status(401).json({
                error: "unauthorised",
                message: "You must be signed in to access this resource",
            });
            return;
        }

        //Attach authenticated user and session to the request
        (req as AuthenticatedRequest).user = sessionData.user;
        (req as AuthenticatedRequest).session = sessionData.session;

        next();
    } catch(error) {
        logger.error({ err: error }, "Authentication middleware error");
        res.status(401).json({
            error: "unauthorised",
            message: "Session verification failed",
        });
    }
}