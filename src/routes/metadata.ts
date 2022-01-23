import * as Router from 'koa-router';
import * as JobController from '../controllers/job';
import * as MediaController from '../controllers/media';
// import { subversions } from '../helpers/subversioning';

const router = new Router({ prefix: '/v1/media-metadata' });

router.post('/job', async(ctx) => {
  //ctx.set('X-Api-Subversion', subversions['series']);
  await JobController.create(ctx);
});

router.get('/job/:jobId', async(ctx) => {
    //ctx.set('X-Api-Subversion', subversions['series']);
  await JobController.get(ctx);
});


router.get('/', async(ctx) => {
  //ctx.set('X-Api-Subversion', subversions['season']);
  await MediaController.getByIds(ctx);
});
export default router;
