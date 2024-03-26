import * as Router from 'koa-router';

import * as MediaController from '../controllers/media';
import { subversions } from '../helpers/subversioning';

const router = new Router({ prefix: '/api/media' });

router.get('/series/v2', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['series']);
  await MediaController.getSeriesV2(ctx);
});

router.get('/video/v2', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['video']);
  await MediaController.getVideoV2(ctx);
});

router.get('/season', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['season']);
  await MediaController.getSeason(ctx);
});

router.get('/localize', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['localize']);
  await MediaController.getLocalize(ctx);
});

router.get('/collection', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['collection']);
  await MediaController.getCollection(ctx);
});

export default router;
