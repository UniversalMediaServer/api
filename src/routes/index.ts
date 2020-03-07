import { Context } from 'koa';
import * as Router from 'koa-router';

const router = new Router();
router.get('/', (ctx: Context) => {
  ctx.body = { status: 'OK' };
});

export default router;
