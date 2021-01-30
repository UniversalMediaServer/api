console.log(10);
import * as Koa from 'koa';
import { Context } from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as helmet from 'koa-helmet';
import * as mongoose from 'mongoose';
import * as Debug from 'debug';
const debug = Debug('universalmediaserver-api:server');
console.log(11);
import indexRouter from './routes/index';
import mediaRouter  from './routes/media';
import { ExternalAPIError, IMDbIDNotFoundError, MediaNotFoundError, ValidationError } from './helpers/customErrors';
console.log(12);
const app = new Koa();

import connect from './models/connection';

const db: string = process.env.MONGO_URL;
const PORT: string = process.env.PORT || '3000';
const bypassMongo: boolean = Boolean(process.env.BYPASS_MONGO) || false;
console.log(13);
connect(db);
console.log(14);
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

app.use(async(ctx: Context, next) => {
  debug(`${ctx.method} ${ctx.url}`);
  await next();
});

app.use(async(ctx: Context, next) => {
  if (bypassMongo) {
    await mongoose.connection.dropDatabase();
  }
  await next();
});

app.use(bodyParser());
console.log(1);
app.use(mediaRouter.routes());
console.log(2);
app.use(indexRouter.routes());

export const server = app.listen(PORT);
console.log(`UMS API is up and running on port ${PORT}`);

export default app;
