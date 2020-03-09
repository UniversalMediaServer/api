import { Context } from 'koa';
import * as _ from 'lodash';

import { ValidationError } from '../helpers/customErrors';
import FailedLookups from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import osAPI from '../services/opensubtitles';
import imdbAPI from '../services/imdb-api';

const MESSAGES = {
  notFound: 'Metadata not found on OpenSubtitles',
  openSubsOffline: 'OpenSubtitles API seems offline, please try again later',
};

export const FAILED_LOOKUP_SKIP_DAYS = 30;

export const getByOsdbHash = async(ctx: Context) => {
  const { osdbhash: osdbHash, filebytesize } = ctx.params;
  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash }).lean();

  if (dbMeta) {
    return ctx.body = dbMeta;
  }
  if (await FailedLookups.findOne({ osdbHash }).lean()) {
    return ctx.body = MESSAGES.notFound;
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
      ctx.status = 404;
    }
    throw err;
  }

  // Fail early if OpenSubtitles reports that it did not recognize the hash
  if (!osMeta.metadata) {
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }

  // console.log(1,osMeta.metadata);
  const newMetadata = {
    actors: _.isEmpty(Object.values(osMeta.metadata.cast)) ? null : Object.values(osMeta.metadata.cast),
    genres: _.isEmpty(osMeta.metadata.genres) ? null : osMeta.metadata.genres,
    goofs: osMeta.metadata.goofs,
    imdbID: osMeta.metadata.imdbid,
    osdbHash: osMeta.moviehash,
    tagline: osMeta.metadata.tagline,
    title: osMeta.metadata.title,
    trivia: osMeta.metadata.trivia,
    type: osMeta.type,
    year: osMeta.metadata.year,
  };

  try {
    dbMeta = await MediaMetadata.create(newMetadata);
    return ctx.body = dbMeta;
  } catch (e) {
    if (e.name === 'ValidationError') {
      // continue for validation errors
    } else {
      throw e;
    }
  }

  const imdbData: any = await imdbAPI.get({ id: newMetadata.imdbID });
  newMetadata.actors = newMetadata.actors || imdbData.actors.split(', ');
  newMetadata.genres = newMetadata.genres || imdbData.genres.split(', ');
  newMetadata.title = newMetadata.title || imdbData.title;

  try {
    dbMeta = await MediaMetadata.create(newMetadata);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }
};

export const getBySanitizedTitle = async(ctx: Context) => {
  const { title, language = 'eng' } = ctx.request.body;

  if (!title) {
    throw new Error('title is required');
  }

  const dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ title, 'metadata.language': language }).lean();

  if (dbMeta) {
    return ctx.body = dbMeta;
  }

  if (await FailedLookups.findOne({ title, language }).lean()) {
    return ctx.body = MESSAGES.notFound;
  }

  const { token } = await osAPI.login();
  const { data } = await osAPI.api.SearchSubtitles(token, [{ query: title, sublanguageid: language }]);

  if (!data) {
    await FailedLookups.updateOne({ title, language }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }

  const newMetadata = {
    episodeNumber: data[0].SeriesEpisode,
    imdbID: 'tt' + data[0].IDMovieImdb, // OpenSubtitles returns the "tt" for hash searches but not query searches
    metadata: { language },
    seasonNumber: data[0].SeriesSeason,
    title: data[0].MovieName,
    type: data[0].MovieKind,
    year: data[0].MovieYear,
  };

  await MediaMetadata.create(newMetadata);
  return ctx.body = newMetadata;
};
