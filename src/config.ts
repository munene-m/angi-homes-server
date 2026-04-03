import dotenv from "dotenv";

const envFile = `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ""}`;
dotenv.config({ override: true, path: envFile });

export default {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || "5001",
  databaseUrl: process.env.DATABASE_URL!,
  databaseSslEnabled:
    process.env.DATABASE_SSL_ENABLED === "true" ||
    process.env.NODE_ENV === "production",
  databaseSslRejectUnauthorized:
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  betterAuth: {
    url: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || "5001"}`,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  }
};
