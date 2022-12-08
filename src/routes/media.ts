import * as Router from 'koa-router';
import * as client from 'prom-client';
import * as MediaController from '../controllers/media';
import { subversions } from '../helpers/subversioning';

const seriesV2Counter = new client.Counter({ name: 'series_v2_endpoint', help: 'Counter of get requests to /series/v2' });
const videoV2Counter = new client.Counter({ name: 'video_v2_endpoint', help: 'Counter of get requests to /video/v2' });
const seasonCounter = new client.Counter({ name: 'season_endpoint', help: 'Counter of get requests to /season' });
const localizeCounter = new client.Counter({ name: 'localize_endpoint', help: 'Counter of get requests to /localize' });

const router = new Router({ prefix: '/api/media' });

router.get('/series/v2', async(ctx) => {
  seriesV2Counter.inc();
  ctx.set('X-Api-Subversion', subversions['series']);
  await MediaController.getSeriesV2(ctx);
});

router.get('/video/v2', async(ctx) => {
  videoV2Counter.inc();
  ctx.set('X-Api-Subversion', subversions['video']);
  await MediaController.getVideoV2(ctx);
});

router.get('/season', async(ctx) => {
  seasonCounter.inc();
  ctx.set('X-Api-Subversion', subversions['season']);
  await MediaController.getSeason(ctx);
});

router.get('/localize', async(ctx) => {
  localizeCounter.inc();
  ctx.set('X-Api-Subversion', subversions['localize']);
  await MediaController.getLocalize(ctx);
});

export default router;
