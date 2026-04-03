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
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
    cookies: {
      session_token: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
      session_data: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
      dont_remember: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
      account_data: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
    },
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
