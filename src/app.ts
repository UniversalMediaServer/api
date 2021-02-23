import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as helmet from 'koa-helmet';
import * as Debug from 'debug';
import * as fs from 'fs';
import http = require('http');
import https = require('https');
const debug = Debug('universalmediaserver-api:server');

import indexRouter from './routes/index';
import mediaRouter  from './routes/media';
import { ExternalAPIError, IMDbIDNotFoundError, MediaNotFoundError, ValidationError } from './helpers/customErrors';

const app = new Koa();

import connect from './models/connection';

const db: string = process.env.MONGO_URL;
const PORT: string = process.env.PORT || '3000';
connect(db);

app.use(helmet());
// error handler
app.use(async(ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof MediaNotFoundError || err instanceof IMDbIDNotFoundError) {
      ctx.status = 404;
    }
    if (err instanceof ValidationError) {
      ctx.status = 422;
    }
    if (err instanceof ExternalAPIError) {
      ctx.status = 503;
    }
    ctx.status = ctx.status || err.status || 500;
    ctx.body = { 'error': err.message };
    if (process.env.NODE_ENV !== 'production') {
      ctx.body.stack = err.stack;
    }
    if (
      process.env.NODE_ENV !== 'test' &&
      (
        !(err instanceof MediaNotFoundError) &&
        !(err instanceof IMDbIDNotFoundError) &&
        !(err instanceof ExternalAPIError)
      )
    ) {
      console.error(err);
    }
  }
});

app.use(async(ctx, next) => {
  debug(`${ctx.method} ${ctx.url}`);
  await next();
});

app.use(bodyParser());
app.use(mediaRouter.routes());
app.use(indexRouter.routes());

export const server = http.createServer(app.callback()).listen(PORT);
console.log(`UMS API HTTP server is up and running on port ${PORT}`);

if (process.env.UMS_API_PRIVATE_KEY_LOCATION && process.env.UMS_API_PUBLIC_KEY_LOCATION) {
  const httpsOptions = {
    key: fs.readFileSync(process.env.UMS_API_PRIVATE_KEY_LOCATION),
    cert: fs.readFileSync(process.env.UMS_API_PUBLIC_KEY_LOCATION),
  };
  https.createServer(httpsOptions, app.callback()).listen(443);
  console.log('UMS API HTTPS server is up and running on port 443');
}

export default app;
