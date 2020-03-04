import FailedLookups from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { Request, Response } from 'express';
import * as asyncHandler from 'express-async-handler';
import osAPI from '../services/opensubtitles';
import imdbAPI from '../services/imdb-api';

const MESSAGES = {
  notFound: 'Metadata not found on OpenSubtitles',
  openSubsOffline: 'OpenSubtitles API seems offline, please try again later',
};

/**
 * Checks whether our information is complete enough to not be
 * added to the FailedLookups collection.
 *
 * @param mediaSoFar the incoming data to evaluate
 */
const isInformationCompleteEnough = (mediaSoFar): boolean => {
  if (
    !mediaSoFar.metadata ||
    !mediaSoFar.metadata.actors ||
    !mediaSoFar.metadata.genres ||
    !mediaSoFar.metadata.title
  ) {
    return false;
  }
  return true;
};

export const getByOsdbHash = asyncHandler(async(req: Request, res: Response) => {
  const { osdbhash: osdbHash, filebytesize } = req.params;
  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash }).lean();

  if (dbMeta) {
    return res.json(dbMeta);
  }
  if (await FailedLookups.findOne({ osdbHash }).lean()) {
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

  const newMetadata = {
    actors: Object.values(osMeta.metadata.cast),
    genres: osMeta.metadata.genres,
    goofs: osMeta.metadata.goofs,
    imdbID: osMeta.metadata.imdbid,
    osdbHash: osMeta.moviehash,
    subcount: osMeta.subcount,
    tagline: osMeta.metadata.tagline,
    title: osMeta.metadata.title.startsWith('Episode #') ? undefined : osMeta.metadata.title,
    trivia: osMeta.metadata.trivia,
    type: osMeta.type,
    year: osMeta.metadata.year,
  };

  if (!isInformationCompleteEnough(newMetadata)) {
    const imdbData: any = await imdbAPI.get({ id: newMetadata.imdbID });
    newMetadata.actors = newMetadata.actors || imdbData.actors.split(', ');
    newMetadata.genres = newMetadata.genres || imdbData.genres.split(', ');
    newMetadata.title = newMetadata.title || imdbData.title;

    if (!isInformationCompleteEnough(newMetadata)) {
      await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
      return res.json(MESSAGES.notFound);
    }
  }


  dbMeta = await MediaMetadata.create(newMetadata);
  return res.json(dbMeta);
});

export const getBySanitizedTitle = asyncHandler(async(req: Request, res: Response) => {
  const { title, language = 'eng' } = req.body;

  if (!title) {
    throw new Error('title is required');
  }

  const dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ title, 'metadata.language': language }).lean();

  if (dbMeta) {
    return res.json(dbMeta);
  }

  if (await FailedLookups.findOne({ title, language }).lean()) {
    return res.json(MESSAGES.notFound);
  }

  const { token } = await osAPI.login();
  const { data } = await osAPI.api.SearchSubtitles(token, [{ query: title, sublanguageid: language }]);

  if (!data) {
    await FailedLookups.updateOne({ title, language }, {}, { upsert: true, setDefaultsOnInsert: true });
    return res.json(MESSAGES.notFound);
  }

  const newMetadata = {
    episodeNumber: data[0].SeriesEpisode,
    metadata: { language },
    imdbID: 'tt' + data[0].IDMovieImdb, // OpenSubtitles returns the "tt" for hash searches but not query searches
    year: data[0].MovieYear,
    seasonNumber: data[0].SeriesSeason,
    title: data[0].MovieName,
    type: data[0].MovieKind,
  };

  await MediaMetadata.create(newMetadata);
  return res.json(newMetadata);
});
