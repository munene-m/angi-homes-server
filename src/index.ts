import { Elysia, Context } from "elysia";
import config from "./config";
import { drizzleConnect } from "./db/drizzle";
import { ensureAccessControlSeed } from "./lib/access-control";
import { auth } from "./lib/auth";
import { residentsApp } from "./modules/residents";
import { usersApp } from "./modules/users";
import { fromTypes, openapi } from '@elysiajs/openapi';


const betterAuthView = (context: Context) => {
    const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"]
    // validate request method
    if(BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
        return auth.handler(context.request);
    } else {
        context.status(405);
    }
}

const startServer = async () => {
  await drizzleConnect()
  await ensureAccessControlSeed()

  const app = new Elysia()
    .use(
      openapi({
        references: fromTypes(),
        path: '/docs',
        documentation: {
          info: {
            title: 'Angi Homes API',
            version: '1.0.0',
            description: 'API for managing Angi Homes application',
          }
        }
      })
    )
    .all('/api/auth/*', betterAuthView)
    .use(usersApp)
    .use(residentsApp)
    .listen(Number(config.port))

  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
}

void startServer();
