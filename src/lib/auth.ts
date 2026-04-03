import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/drizzle"; // your drizzle instance
import config from "../config";

export const auth = betterAuth({
  trustedOrigins: [
    "http://localhost:5175",
    "http://localhost:5174",
    "http://localhost:5173",
    "https://angi-homes-admin.pages.dev",
    ...config.betterAuth.trustedOrigins,
  ],
  baseURL: config.betterAuth.url,
  secret: config.betterAuth.secret,
  useSecureCookies: true,
  defaultCookieAttributes: {
    sameSite: "none",
    secure: true,
    httpOnly: true,
  },
  database: drizzleAdapter(db,{
    provider: "pg"
  }),
  user: {
    additionalFields: {
      userType: {
        type: "string",
        required: false,
        defaultValue: "staff",
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true
  }
});
