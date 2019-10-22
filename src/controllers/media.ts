import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { Request, Response, NextFunction } from 'express';
import * as asyncHandler from 'express-async-handler';

export const getByOsdbHash = asyncHandler(async(req: Request, res: Response, next: NextFunction) => {
  const meta: MediaMetadataInterface = await MediaMetadata.findOne({osdbHash: req.params.osdbhash});

  if (meta) {
    return res.json(meta);
  } 

  return res.sendStatus(204);

});
