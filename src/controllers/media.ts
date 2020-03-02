import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { Request, Response } from 'express';
import * as asyncHandler from 'express-async-handler';
import * as moment  from 'moment';
import osAPI from '../services/opensubtitles';
import imdbAPI from '../services/imdb-api';

const MESSAGES = {
  notFound: 'Metadata not found on OpenSubtitles',
  openSubsOffline: 'OpenSubtitles API seems offline, please try again later',
};

export const FAILED_LOOKUP_SKIP_DAYS = 30;

export const isSkipFailedLookup = async(dbQuery): Promise<boolean> => {
  const recordFromFailedLookupsCollection: FailedLookupsInterface = await FailedLookups.findOne({ dbQuery });
  if (!recordFromFailedLookupsCollection) {
    return false;
  }
  const dateOfLastFailedLookup = recordFromFailedLookupsCollection.updatedAt;
  const numberOfDaysSinceLastAttempt = moment().diff(moment(dateOfLastFailedLookup), 'days');
  if (numberOfDaysSinceLastAttempt < FAILED_LOOKUP_SKIP_DAYS) {
    return true;
  } 
  return false;
};

export const getByOsdbHash = asyncHandler(async(req: Request, res: Response) => {
  const { osdbhash: osdbHash, filebytesize } = req.params;
  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash });

  if (dbMeta) {
    return res.json(dbMeta);
  }
  if (await FailedLookups.findOne({ osdbHash })) {
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
    genres: osMeta.metadata.genres,
    actors: Object.values(osMeta.metadata.cast),
  };

  // if we're missing values for genres or actors, attempt to hydrate them from imdbAPI instead of OpenSubtitles
  if ([newMetadata.genres, newMetadata.actors].some(val => val === undefined || []) && newMetadata.imdbID) {
    try {
      const imdbData: any = await imdbAPI.get({ id: newMetadata.imdbID });
      newMetadata.actors = imdbData.actors.split(', ');
      newMetadata.genres = imdbData.genres.split(', ');
    } catch (e) {
      // ignore error, this shouldn't make the request fail
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

  const dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ title, 'metadata.language': language });

  if (dbMeta) {
    return res.json(dbMeta);
  }

  if (await FailedLookups.findOne({ title, language })) {
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
