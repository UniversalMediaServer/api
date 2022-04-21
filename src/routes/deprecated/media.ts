import * as Router from 'koa-router';
import * as client from 'prom-client';
import * as DeprecatedMediaController from '../../controllers/deprecated/media';
import { subversions } from '../../helpers/subversioning';

const osdbCounter = new client.Counter({ name: 'osdb_endpoint', help: 'Counter of get requests to /osdbhash/:osdbhash/:filebytesize (deprecated)' });
const seriesTitleCounter = new client.Counter({ name: 'seriestitle_endpoint', help: 'Counter of get requests to /seriestitle (deprecated)' });
const videoCounter = new client.Counter({ name: 'video_endpoint', help: 'Counter of get requests to /video' });
const titleCounter = new client.Counter({ name: 'title_endpoint', help: 'Counter of get requests to /title (deprecated)' });
const titlev2Counter = new client.Counter({ name: 'titlev2_endpoint', help: 'Counter of get requests to /v2/title (deprecated)' });
const imdbCounter = new client.Counter({ name: 'imdbid_endpoint', help: 'Counter of get requests to /imdbid (deprecated)' });

const router = new Router({ prefix: '/api/media' });

router.get('/osdbhash/:osdbhash/:filebytesize', async(ctx) => {
  osdbCounter.inc();
  await DeprecatedMediaController.getByOsdbHash(ctx);
});

router.get('/title', async(ctx) => {
  titleCounter.inc();
  await DeprecatedMediaController.getBySanitizedTitle(ctx);
});

router.get('/v2/title', async(ctx) => {
  titlev2Counter.inc();
  await DeprecatedMediaController.getBySanitizedTitleV2(ctx);
});

router.get('/imdbid', async(ctx) => {
  imdbCounter.inc();
  await DeprecatedMediaController.getByImdbID(ctx);
});

router.get('/seriestitle', async(ctx) => {
  seriesTitleCounter.inc();
  ctx.set('X-Api-Subversion', subversions['series']);
  await DeprecatedMediaController.getSeries(ctx);
});

router.get('/video', async(ctx) => {
  videoCounter.inc();
  ctx.set('X-Api-Subversion', subversions['video']);
  await DeprecatedMediaController.getVideo(ctx);
});

export default router;
