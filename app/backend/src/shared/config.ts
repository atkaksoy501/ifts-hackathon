import "dotenv/config";
import { z } from "zod";

const booleanEnvSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_DIST: z.string().default("../frontend/dist"),
  MONGO_URI: z.string().optional(),
  MONGO_DB_NAME: z.string().default("hackathon"),
  JWT_SECRET: z.string().min(8).default("dev-secret-change-me"),
  JWT_COOKIE_NAME: z.string().default("module1_session"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("admin12345"),
  ADMIN_DISPLAY_NAME: z.string().default("Admin"),
  GITHUB_STATE_URL: z.string().url().default("https://raw.githubusercontent.com/example/jira-live/main/state.json"),
  GITHUB_STATE_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  CATALOG_STORE: z.enum(["memory", "mongo"]).default("memory"),
  SYNC_DISABLED: booleanEnvSchema.default(false),
  SYNC_STARTUP_ENABLED: booleanEnvSchema.default(true),
  SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(300000),
  HOURS_PER_STORY_POINT: z.coerce.number().positive().default(6),
  DEFAULT_PROJECT_KEY: z.string().default("ICTFT")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(source);
}
