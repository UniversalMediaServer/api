import * as Router from 'koa-router';
import * as client from 'prom-client';
import * as MediaController from '../controllers/media';
import { subversions } from '../helpers/subversioning';

const seriesTitleCounter = new client.Counter({ name: 'seriestitle_endpoint', help: 'Counter of get requests to /seriestitle' });
const videoCounter = new client.Counter({ name: 'video_endpoint', help: 'Counter of get requests to /video' });
const seasonCounter = new client.Counter({ name: 'season_endpoint', help: 'Counter of get requests to /season' });

const router = new Router({ prefix: '/api/media' });

router.get('/seriestitle', async(ctx) => {
  seriesTitleCounter.inc();
  ctx.set('X-Api-Subversion', subversions['series']);
  await MediaController.getSeries(ctx);
});

router.get('/video', async(ctx) => {
  videoCounter.inc();
  ctx.set('X-Api-Subversion', subversions['video']);
  await MediaController.getVideo(ctx);
});

router.get('/season', async(ctx) => {
  seasonCounter.inc();
  ctx.set('X-Api-Subversion', subversions['season']);
  await MediaController.getSeason(ctx);
});

export default router;
