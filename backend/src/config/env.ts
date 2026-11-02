import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url("Database url must be a valid PostgreSQL connection URL"),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
    BETTER_AUTH_SECRET: z.string().min(32, "Better Auth Secret must be at least 32 characters long"),
    CLOUDINARY_CLOUD_NAME: z.string().default("dbilyycfk"),
    CLOUDINARY_API_KEY: z.string().default("827566424593843"),
    CLOUDINARY_API_SECRET: z.string().default("KBD7SbYuUSu6cIeqH34YxqzpbGY"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;