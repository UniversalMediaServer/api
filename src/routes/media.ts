import * as Router from 'koa-router';
import * as MediaController from '../controllers/media';

const router = new Router({ prefix: '/api/media' });

router.get('/osdbhash/:osdbhash/:filebytesize', async(ctx) => {
  await MediaController.getByOsdbHash(ctx);
});

router.get('/title', async(ctx) => {
  await MediaController.getBySanitizedTitle(ctx);
});

router.get('/v2/title', async(ctx) => {
  await MediaController.getBySanitizedTitleV2(ctx);
});

router.get('/seriestitle', async(ctx) => {
  await MediaController.getSeriesByTitle(ctx);
});

router.get('/imdbid', async(ctx) => {
  await MediaController.getByImdbID(ctx);
});

export default router;
