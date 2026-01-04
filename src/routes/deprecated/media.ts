import Router from 'koa-router';
import * as DeprecatedMediaController from '../../controllers/deprecated/media';
import { subversions } from '../../helpers/subversioning';
import { DeprecationError } from '../../helpers/customErrors';

const router = new Router({ prefix: '/api/media' });

// We aren't connected to OpenSubtitles API anymore so this can never succeed
router.get('/osdbhash/:osdbhash/:filebytesize', async() => {
  throw new DeprecationError();
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
