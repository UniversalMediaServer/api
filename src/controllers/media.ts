import { SearchRequest } from 'imdb-api';
import { Context } from 'koa';
import * as _ from 'lodash';

import FailedLookups from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import osAPI from '../services/opensubtitles';
import imdbAPI from '../services/imdb-api';

const MESSAGES = {
  notFound: 'Metadata not found on OpenSubtitles',
  openSubsOffline: 'OpenSubtitles API seems offline, please try again later',
};

/**
 * Attempts a query to the IMDb API and standardizes the response
 * before returning.
 *
 * IMDb does not return goofs, osdbHash, tagline, trivia
 *
 * We use ts-ignore to be able to use episode data instead of just movie.
 * @see https://github.com/worr/node-imdb-api/issues/72
 *
 * @param imdbId the IMDb ID
 * @param searchRequest a query to perform in order to get the imdbId
 */
const getFromIMDbAPI = async(imdbId?: string, searchRequest?: SearchRequest): Promise<MediaMetadataInterface> => {
  if (!imdbId) {
    const searchResults = await imdbAPI.search(searchRequest);
    // TODO Choose the most appropriate result instead of just the first
    const searchResult = _.first(searchResults.results);
    imdbId = searchResult.imdbid;
  }
  const newMetadata: any = {};
  newMetadata.id = imdbId;

  const imdbData = await imdbAPI.get({ id: imdbId });

  newMetadata.actors = _.isEmpty(imdbData.actors) ? null : imdbData.actors.split(', ');
  newMetadata.directors = _.isEmpty(imdbData.director) ? null : imdbData.director.split(', ');
  // @ts-ignore
  newMetadata.episodeNumber = imdbData.episode;
  newMetadata.episodeTitle = imdbData.title;
  newMetadata.genres = _.isEmpty(imdbData.genres) ? null : imdbData.genres.split(', ');
  // @ts-ignore
  newMetadata.seasonNumber = imdbData.season;
  newMetadata.type = imdbData.type;
  newMetadata.year = imdbData.year.toString();

  return newMetadata;
};

export const FAILED_LOOKUP_SKIP_DAYS = 30;

export const getByOsdbHash = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
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
    console.log(1);
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }

  let newMetadata = {
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
    console.log(2, e, newMetadata);
    if (e.name === 'ValidationError') {
      // continue for validation errors
    } else {
      throw e;
    }
  }

  const imdbData: MediaMetadataInterface = await getFromIMDbAPI(newMetadata.imdbID);

  newMetadata = _.merge(newMetadata, imdbData);

  try {
    dbMeta = await MediaMetadata.create(newMetadata);
    return ctx.body = dbMeta;
  } catch (e) {
    console.log(3, e);
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }
};

export const getBySanitizedTitle = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { title, language = 'eng' } = ctx.request.body;

  if (!title) {
    throw new Error('title is required');
  }

  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ title, 'metadata.language': language }).lean();

  if (dbMeta) {
    return ctx.body = dbMeta;
  }

  if (await FailedLookups.findOne({ title, language }).lean()) {
    return ctx.body = MESSAGES.notFound;
  }

  const searchRequest: SearchRequest = { name: title };
  const imdbData: MediaMetadataInterface = await getFromIMDbAPI(null, searchRequest);

  try {
    dbMeta = await MediaMetadata.create(imdbData);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ title, language }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }

  /**
   * OpenSubtitles-api doesn't return complete enough data from
   * its SearchSubtitles function so this section of the code is
   * intentionally unreachable until we can figure out how to search
   * OpenSubtitles for that fallback data.
   */
  try {
    dbMeta = await MediaMetadata.create(imdbData);
    return ctx.body = dbMeta;
  } catch (e) {
    if (e.name === 'ValidationError') {
      // continue for validation errors
    } else {
      throw e;
    }
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
    seasonNumber: data[0].SeriesSeason,
    title: data[0].MovieName,
    type: data[0].MovieKind,
    year: data[0].MovieYear,
  };

  try {
    dbMeta = await MediaMetadata.create(newMetadata);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ title, language }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }
};
