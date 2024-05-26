import * as Router from 'koa-router';
import * as DeprecatedMediaController from '../../controllers/deprecated/media';
import { subversions } from '../../helpers/subversioning';

const router = new Router({ prefix: '/api/media' });

router.get('/osdbhash/:osdbhash/:filebytesize', async() => {
  await DeprecatedMediaController.getByOsdbHash();
});

router.get('/title', async(ctx) => {
  await DeprecatedMediaController.getBySanitizedTitle(ctx);
});

router.get('/v2/title', async(ctx) => {
  await DeprecatedMediaController.getBySanitizedTitleV2(ctx);
});

router.get('/imdbid', async(ctx) => {
  await DeprecatedMediaController.getByImdbID(ctx);
});

router.get('/seriestitle', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['series']);
  await DeprecatedMediaController.getSeries(ctx);
});

router.get('/video', async(ctx) => {
  ctx.set('X-Api-Subversion', subversions['video']);
  await DeprecatedMediaController.getVideo(ctx);
});

export default router;
