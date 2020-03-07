import * as Koa from 'koa';
import { Context } from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as helmet from 'koa-helmet';
import * as Debug from 'debug';
const debug = Debug('universalmediaserver-api:server');

import indexRouter from './routes/index';
import mediaRouter  from './routes/media';

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
    ctx.status = err.status || 500;
    ctx.body = err.message;
    if (process.env.NODE_ENV !== 'production') {
      console.error(err);
    }
  }
});

app.use(async(ctx: Context, next) => {
  debug(`${ctx.method} ${ctx.url}`);
  await next();
});

app.use(bodyParser());
app.use(mediaRouter.routes());
app.use(indexRouter.routes());

app.listen(PORT);
console.log(`UMS API is up and running on port ${PORT}`);

export default app;
