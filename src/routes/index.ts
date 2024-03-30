import * as Router from 'koa-router';
import * as v8 from 'v8';

import { getConfiguration } from '../controllers/configuration';
import { subversions } from '../helpers/subversioning';

const { SYSTEM_ADMIN_KEY, NODE_APP_INSTANCE } = process.env!;

const router = new Router();

router.get('/', (ctx) => {
  ctx.body = { status: 'OK' };
});

router.get('/api/subversions', (ctx) => {
  ctx.body = subversions;
});

router.get('/api/configuration', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['configuration']);
  await getConfiguration(ctx);
});

// add this route to one process
if (NODE_APP_INSTANCE === '0') {
  router.get('/_system/heapdump', async (ctx) => {
    const { key } = ctx.query;
    if (SYSTEM_ADMIN_KEY && (key === SYSTEM_ADMIN_KEY)) {
      v8.writeHeapSnapshot(`/tmp/${Date.now()}.heapsnapshot`);
      ctx.status = 201;
      return;
    }
    ctx.status = 401;
    ctx.body = 'Unauthorized';
  });
}


export default router;
