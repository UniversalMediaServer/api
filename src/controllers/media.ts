import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { Request, Response, NextFunction } from 'express';

export const getById = (req: Request, res: Response, next: NextFunction) => {
  MediaMetadata.findOne({_id: req.params.id}, (err: any, meta: MediaMetadataInterface) => {
    if (err) {
      return next(err);
    } else {
      return res.json(meta);
    }
  });
};
