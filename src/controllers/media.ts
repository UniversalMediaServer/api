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

export const getByOsdbHash = asyncHandler(async(req: Request, res: Response) => {
  const { osdbhash: osdbHash, filebytesize } = req.params;
  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash });

  if (dbMeta) {
    return res.json(dbMeta);
  }

  const recordFromFailedLookupsCollection: FailedLookupsInterface = await FailedLookups.findOne({ osdbHash });
  if (recordFromFailedLookupsCollection) {
    const dateOfLastFailedLookup = recordFromFailedLookupsCollection.updatedAt;
    const numberOfDaysSinceLastAttempt = moment().diff(moment(dateOfLastFailedLookup), 'days');
    if (numberOfDaysSinceLastAttempt < 30) {
      return res.json(MESSAGES.notFound);
    }
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

  const dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ title, language });

  if (dbMeta) {
    return res.json(dbMeta);
  }

  const { token } = await osAPI.login();
  const { data } = await osAPI.api.SearchSubtitles(token, [{ query: title, sublanguageid: language }]);
  // TODO what data do we actually want to store here?
  return res.json(data);
});
