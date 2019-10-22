import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
const router = express.Router();

router.get('/', function(req: Request, res: Response, next: NextFunction) {
  return res.json({ status: 'OK' });
});

export default router;
