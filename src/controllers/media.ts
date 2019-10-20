import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { Request, Response, NextFunction } from 'express';

export const getByOsdbHash = (req: Request, res: Response, next: NextFunction) => {
  MediaMetadata.findOne({osdbHash: req.params.osdbhash}, (err: any, meta: MediaMetadataInterface) => {
    if (err) {
      return next(err);
    } else {
      if (meta) {
        return res.json(meta);
      } 

      return res.sendStatus(204);
      
    }
  });
};
