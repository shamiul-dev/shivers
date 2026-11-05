import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url("Database url must be a valid PostgreSQL connection URL"),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
    BETTER_AUTH_SECRET: z.string().min(32, "Better Auth Secret must be at least 32 characters long"),
    CLOUDINARY_CLOUD_NAME: z.string().min(1, "Cloudinary cloud name is required"),
    CLOUDINARY_API_KEY: z.string().min(1, "Cloudinary API key is required"),
    CLOUDINARY_API_SECRET: z.string().min(1, "Cloudinary API secret is required"),
    UPLOAD_FOLDER_PREFIX: z.string().default("shivers"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;