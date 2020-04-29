import * as Koa from 'koa';
import { Context } from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as helmet from 'koa-helmet';
import * as Debug from 'debug';
const debug = Debug('universalmediaserver-api:server');

import indexRouter from './routes/index';
import mediaRouter  from './routes/media';
import { ExternalAPIError, MediaNotFoundError, IMDbIDNotFoundError } from './helpers/customErrors';

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
    if (err instanceof ExternalAPIError) {
      ctx.status = 503;
    }
    ctx.status = ctx.status || err.status || 500;
    ctx.body = { 'error': err.message };
    if (process.env.NODE_ENV !== 'production') {
      ctx.body.stack = err.stack;
    }
    console.error(err);
  }
});

app.use(async(ctx: Context, next) => {
  debug(`${ctx.method} ${ctx.url}`);
  await next();
});

app.use(bodyParser());
app.use(mediaRouter.routes());
app.use(indexRouter.routes());

export const server = app.listen(PORT);
console.log(`UMS API is up and running on port ${PORT}`);

export default app;
