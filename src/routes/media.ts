import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as MediaController from '../controllers/media';
const router = express.Router();

router.get('/:id', function(req: Request, res: Response, next: NextFunction) {
  MediaController.getById(req, res, next);
});

export default router;
