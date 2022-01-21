import * as Router from 'koa-router';
import * as DeprecatedMediaController from '../../controllers/deprecated/media';

const router = new Router({ prefix: '/api/media' });

router.get('/osdbhash/:osdbhash/:filebytesize', async(ctx) => {
  await DeprecatedMediaController.getByOsdbHash(ctx);
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

export default router;
