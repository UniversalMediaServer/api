import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as MediaController from '../controllers/media';
const router = express.Router();

router.get('/:osdbhash/:filebytesize', function(req: Request, res: Response, next: NextFunction) {
  MediaController.getByOsdbHash(req, res, next);
});

router.post('/title', function(req: Request, res: Response, next: NextFunction) {
  MediaController.getBySanitizedTitle(req, res, next);
});

export default router;
