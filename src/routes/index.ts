import * as express from 'express';
import { Request, Response } from 'express';
const router = express.Router();

router.get('/', function(req: Request, res: Response) {
  return res.json({ status: 'OK' });
});

export default router;
