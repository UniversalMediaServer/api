import * as Router from 'koa-router';
import { getAggregateMetrics } from 'pm2-cluster-prom';
import { getConfig } from '../controllers/info';
import { subversions } from '../helpers/subversioning';

const router = new Router();
router.get('/', (ctx) => {
  ctx.body = { status: 'OK' };
});

router.get('/metrics', async(ctx) => {
  const metrics = await getAggregateMetrics();
  ctx.body = await metrics.metrics();
  ctx.set('Content-Type', 'text/plain');
});

router.get('/api/subversions', (ctx) => {
  ctx.body = subversions;
});

router.get('/api/configuration', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['configuration']);
  await getConfig(ctx);
});

export default router;
