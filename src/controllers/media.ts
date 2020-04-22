import { SearchRequest } from 'imdb-api';
import { Context } from 'koa';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';

import FailedLookups from '../models/FailedLookups';
import EpisodeProcessing from '../models/EpisodeProcessing';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import osAPI from '../services/opensubtitles';
import imdbAPI from '../services/imdb-api';
import { mapper } from '../utils/data-mapper';

const MESSAGES = {
  notFound: 'Metadata not found on OpenSubtitles',
  openSubsOffline: 'OpenSubtitles API seems offline, please try again later',
  seriesNotFound: 'Metadata not found for series',
};

export const FAILED_LOOKUP_SKIP_DAYS = 30;

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
    const parsedFilename = episodeParser(searchRequest.name);
    const isTVEpisode = parsedFilename && parsedFilename.show && parsedFilename.season && parsedFilename.episode;
    if (isTVEpisode) {
      const tvSeriesInfo = await imdbAPI.get({ name: parsedFilename.show });
      // @ts-ignore
      const allEpisodes = await tvSeriesInfo.episodes();
      const currentEpisode = _.find(allEpisodes, { season: parsedFilename.season, episode: parsedFilename.episode });
      imdbId = currentEpisode.imdbid;
      await EpisodeProcessing.create({ seriesimdbid: tvSeriesInfo.imdbid });
    } else {
      const searchResults = await imdbAPI.search(searchRequest);
      // TODO Choose the most appropriate result instead of just the first
      const searchResult: any = _.first(searchResults.results);
      imdbId = searchResult.imdbid;
    }
  }

  const imdbData = await imdbAPI.get({ id: imdbId });

  let metadata;
  if (imdbData.type === 'movie') {
    metadata = mapper.parseIMDBAPIMovieResponse(imdbData);
  } else if (imdbData.type === 'series') {
    metadata = mapper.parseIMDBAPISeriesResponse(imdbData);
  } else {
    metadata = mapper.parseIMDBAPIEpisodeResponse(imdbData);
  }

  metadata.id = imdbId;
  return metadata;
};

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

  let openSubtitlesResponse: OpensubtitlesIdentifyResponse;
  try {
    openSubtitlesResponse = await osAPI.identify(osQuery);
  } catch (err) {
    if (err.message === 'API seems offline') {
      err.message = MESSAGES.openSubsOffline;
      ctx.status = 404;
    }
    throw err;
  }

  // Fail early if OpenSubtitles reports that it did not recognize the hash
  if (!openSubtitlesResponse.metadata) {
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }

  const parsedOpenSubtitlesResponse = mapper.parseOpenSubtitlesResponse(openSubtitlesResponse);
  const parsedIMDbResponse: MediaMetadataInterface = await getFromIMDbAPI(parsedOpenSubtitlesResponse.imdbID);
  const combinedResponse = _.merge(parsedOpenSubtitlesResponse, parsedIMDbResponse);

  try {
    dbMeta = await MediaMetadata.create(combinedResponse);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }
};

export const getBySanitizedTitle = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { title, language = 'eng' } = ctx.request.body;

  if (!title) {
    throw new Error('title is required');
  }

  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ title }).lean();

  if (dbMeta) {
    return ctx.body = dbMeta;
  }

  if (await FailedLookups.findOne({ title }).lean()) {
    return ctx.body = MESSAGES.notFound;
  }

  const searchRequest: SearchRequest = { name: title };
  const imdbData: MediaMetadataInterface = await getFromIMDbAPI(null, searchRequest);

  if (imdbData.type === 'episode') {
    const tvSeries: SeriesMetadataInterface = await SeriesMetadata.findOne({ imdbID: imdbData.id });
    if (tvSeries) {
      imdbData.title = tvSeries.title;
    }
  }

  try {
    dbMeta = await MediaMetadata.create(imdbData);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ title }, {}, { upsert: true, setDefaultsOnInsert: true });
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

export const getSeriesByTitle = async(ctx: Context): Promise<SeriesMetadataInterface | string> => {
  let { title: dirOrFilename } = ctx.request.body;

  if (!dirOrFilename) {
    throw new Error('title is required');
  }

  let dbMeta: SeriesMetadataInterface = await SeriesMetadata.findSimilarSeries(dirOrFilename);

  if (dbMeta) {
    return ctx.body = dbMeta;
  }

  if (await FailedLookups.findOne({ title: dirOrFilename, type: 'series' }).lean()) {
    return ctx.body = MESSAGES.notFound;
  }

  const parsed = episodeParser(dirOrFilename);
  dirOrFilename = parsed && parsed.show ? parsed.show : dirOrFilename;
  const tvSeriesInfo = await imdbAPI.get({ name: dirOrFilename });

  if (!tvSeriesInfo) {
    await FailedLookups.updateOne({ title: dirOrFilename, type: 'series' }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }
  const metadata = mapper.parseIMDBAPISeriesResponse(tvSeriesInfo);
  dbMeta = await SeriesMetadata.create(metadata);
  return ctx.body = dbMeta;
};

export const getByImdbID = async(ctx: Context): Promise<any> => {
  const { imdbid } = ctx.request.body;

  const [mediaMetadata, seriesMetadata] = await Promise.all([MediaMetadata.findOne({ imdbID: imdbid }).lean(), SeriesMetadata.findOne({ imdbID: imdbid }).lean()]);

  if (mediaMetadata) {
    return ctx.body = mediaMetadata;
  }

  if (seriesMetadata) {
    return ctx.body = seriesMetadata;
  }

  if (await FailedLookups.findOne({ imdbID: imdbid }).lean()) {
    return ctx.body = MESSAGES.notFound;
  }
  const imdbData: MediaMetadataInterface = await getFromIMDbAPI(imdbid);

  try {
    let dbMeta;
    if (imdbData.type === 'series') {
      dbMeta = await SeriesMetadata.create(imdbData);
    } else {
      dbMeta = await MediaMetadata.create(imdbData);
    }
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ imdbId: imdbid }, {}, { upsert: true, setDefaultsOnInsert: true });
    return ctx.body = MESSAGES.notFound;
  }
};
