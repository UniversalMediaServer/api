import * as Router from 'koa-router';
import * as InfoController from '../controllers/info';
import { mediaApiSubversions } from '../helpers/subversioning';

const router = new Router();
router.get('/', (ctx) => {
  ctx.body = { status: 'OK' };
});

router.get('/api/subversions', (ctx) => {
  ctx.body = { '/api/media': mediaApiSubversions };
});

router.get('/api/configuration', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/configuration']);
  await InfoController.getTMDBImageBaseURL(ctx);
});

export default router;
