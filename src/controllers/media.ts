import FailedLookups from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { Request, Response } from 'express';
import * as asyncHandler from 'express-async-handler';
import osAPI from '../services/opensubtitles';

export const getByOsdbHash = asyncHandler(async(req: Request, res: Response) => {
  const { osdbhash: osdbHash, filebytesize } = req.params;
  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash });

  if (dbMeta) {
    return res.json(dbMeta);
  }

  const osQuery = {
    moviehash: osdbHash,
    moviebytesize: parseInt(filebytesize),
    extend: true,
  };

  const osMeta: OpensubtitlesIdentifyResponse = await osAPI.identify(osQuery);

  if (!osMeta.metadata) {
    await FailedLookups.create({ osdbHash });
    return res.status(200).json({ message: 'Metadata not found on OpenSubtitles' });
  }

  const newMetadata = {
    title: osMeta.metadata.title,
    imdbID: osMeta.metadata.imdbid,
    osdbHash: osMeta.moviehash,
    year: osMeta.metadata.year,
    subcount: osMeta.subcount,
    type: osMeta.type,
    goofs: osMeta.metadata.goofs,
    trivia: osMeta.metadata.trivia,
    tagline: osMeta.metadata.tagline,
  };

  dbMeta = await MediaMetadata.create(newMetadata);
  return res.json(dbMeta);
});
