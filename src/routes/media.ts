import * as Router from 'koa-router';
import * as MediaController from '../controllers/media';
import { mediaApiSubversions } from '../helpers/subversioning';

const router = new Router({ prefix: '/api/media' });

router.get('/osdbhash/:osdbhash/:filebytesize', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/osdbhash/:osdbhash/:filebytesize']);
  await MediaController.getByOsdbHash(ctx);
});

router.get('/title', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/title']);
  await MediaController.getBySanitizedTitle(ctx);
});

router.get('/v2/title', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/v2/title']);
  await MediaController.getBySanitizedTitleV2(ctx);
});

router.get('/imdbid', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/imdbid']);
  await MediaController.getByImdbID(ctx);
});

router.get('/seriestitle', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/seriestitle']);
  await MediaController.getSeriesByTitle(ctx);
});

router.get('/video', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/video']);
  await MediaController.getVideo(ctx);
});

router.get('/season', async(ctx) => {
  ctx.set('X-Api-Subversion', mediaApiSubversions['/season']);
  await MediaController.getSeason(ctx);
});

export default router;
