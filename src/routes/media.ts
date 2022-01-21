import * as Router from 'koa-router';
import * as MediaController from '../controllers/media';
import { subversions } from '../helpers/subversioning';

const router = new Router({ prefix: '/api/media' });

router.get('/seriestitle', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['series']);
  await MediaController.getSeries(ctx);
});

router.get('/video', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['video']);
  await MediaController.getVideo(ctx);
});

router.get('/season', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['season']);
  await MediaController.getSeason(ctx);
});

export default router;
