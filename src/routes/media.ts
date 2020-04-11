import * as Router from 'koa-router';
import * as MediaController from '../controllers/media';

const router = new Router({ prefix: '/api/media' });

router.get('/:osdbhash/:filebytesize', async(ctx) => {
  await MediaController.getByOsdbHash(ctx);
});

router.post('/title', async(ctx) => {
  await MediaController.getBySanitizedTitle(ctx);
});

router.post('/seriestitle', async(ctx) => {
  await MediaController.getSeriesByTitle(ctx);
});

export default router;
