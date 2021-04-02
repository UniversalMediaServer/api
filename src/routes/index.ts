import * as Router from 'koa-router';
import { mediaApiSubversions } from '../helpers/subversioning';

const router = new Router();
router.get('/', (ctx) => {
  ctx.body = { status: 'OK' };
});

router.get('/api/subversions', (ctx) => {
  ctx.body = { '/api/media': mediaApiSubversions };
});

export default router;
