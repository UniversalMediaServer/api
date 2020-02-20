import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { Request, Response, NextFunction } from 'express';
import * as asyncHandler from 'express-async-handler';
import * as moment  from 'moment';
import osAPI from '../services/opensubtitles';

const MESSAGES = {
  notFound: 'Metadata not found on OpenSubtitles',
  openSubsOffline: 'OpenSubtitles API seems offline, please try again later',
};

export const FAILED_LOOKUP_SKIP_DAYS = 30;

export const skipFailedLookup = async(dbQuery): Promise<boolean> => {
  const recordFromFailedLookupsCollection: FailedLookupsInterface = await FailedLookups.findOne({ dbQuery });
  if (!recordFromFailedLookupsCollection) {
    return Promise.resolve(false);
  }
  const dateOfLastFailedLookup = recordFromFailedLookupsCollection.updatedAt;
  const numberOfDaysSinceLastAttempt = moment().diff(moment(dateOfLastFailedLookup), 'days');
  if (numberOfDaysSinceLastAttempt < FAILED_LOOKUP_SKIP_DAYS) {
    return Promise.resolve(true);
  } 
  return Promise.resolve(false);
};

export const getByOsdbHash = asyncHandler(async(req: Request, res: Response) => {
  const { osdbhash: osdbHash, filebytesize } = req.params;
  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash });

  if (dbMeta) {
    return res.json(dbMeta);
  }

  if (await skipFailedLookup({ osdbHash })) {
    return res.json(MESSAGES.notFound);
  }

  const osQuery = {
    moviehash: osdbHash,
    moviebytesize: parseInt(filebytesize),
    extend: true,
  };

  let osMeta: OpensubtitlesIdentifyResponse;
  try {
    osMeta = await osAPI.identify(osQuery);
  } catch (err) {
    if (err.message === 'API seems offline') {
      err.message = MESSAGES.openSubsOffline;
      res.status(404);
    }
    throw err;
  }

  if (!osMeta.metadata) {
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
    return res.json(MESSAGES.notFound);
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

export const getBySanitizedTitle = asyncHandler(async(req: Request, res: Response, next: NextFunction) => {
  const { title, language = 'eng' } = req.body;

  if (!title) {
    return next(new Error('title is required'));
  }

  const dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ title, 'metadata.language': language });

  if (dbMeta) {
    return res.json(dbMeta);
  }

  if (await skipFailedLookup({ title, language })) {
    return res.json(MESSAGES.notFound);
  }

  const { token } = await osAPI.login();
  const { data } = await osAPI.api.SearchSubtitles(token, [{ query: title, sublanguageid: language }]);

  if (!data) {
    await FailedLookups.updateOne({ title, language }, {}, { upsert: true, setDefaultsOnInsert: true });
    return res.json(MESSAGES.notFound);
  }

  const newMetadata = {
    title,
    metadata: { language },
    imdbID: data[0].IDMovieImdb,
    year: data[0].MovieYear,
    type: data[0].MovieKind,
  };

  await MediaMetadata.create(newMetadata);
  return res.json(newMetadata);
});
