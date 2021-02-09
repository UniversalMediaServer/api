import { SearchRequest } from 'imdb-api';
import { Context } from 'koa';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import { MediaNotFoundError, ValidationError } from '../helpers/customErrors';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import osAPI from '../services/opensubtitles';
import imdbAPI from '../services/imdb-api';
import * as externalAPIHelper from '../services/external-api-helper';
import { mapper } from '../utils/data-mapper';

export const FAILED_LOOKUP_SKIP_DAYS = 30;

export const getByOsdbHash = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { osdbhash: osdbHash, filebytesize } = ctx.params;

  if (!osdbHash || !filebytesize) {
    throw new ValidationError('osdbhash and filebytesize are required');
  }

  const validateMovieByYear = Boolean(ctx.query?.year);
  const validateEpisodeBySeasonAndEpisode = Boolean(ctx.query?.season && ctx.query?.episode);

  // If we already have a result, return it
  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash }, null, { lean: true }).exec();
  if (dbMeta) {
    return ctx.body = dbMeta;
  }

  // If we already failed to get a result, return early
  if (await FailedLookups.findOne({ osdbHash }, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne({ osdbHash }, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  const osQuery = {
    moviehash: osdbHash,
    moviebytesize: parseInt(filebytesize),
    extend: true,
  };

  const openSubtitlesResponse = await osAPI.identify(osQuery);
  // Fail early if OpenSubtitles reports that it did not recognize the hash
  if (!openSubtitlesResponse.metadata) {
    await FailedLookups.updateOne({ osdbHash }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  // validate that OpenSubtitles has found correct metadata by Osdb hash
  if (validateMovieByYear || validateEpisodeBySeasonAndEpisode) {
    let passedValidation = false;
    if (validateMovieByYear) {
      if (ctx.query.year.toString() === openSubtitlesResponse.metadata.year) {
        passedValidation = true;
      }
    }

    if (validateEpisodeBySeasonAndEpisode) {
      if (ctx.query.season.toString() === openSubtitlesResponse.metadata.season && ctx.query.episode.toString() === openSubtitlesResponse.metadata.episode) {
        passedValidation = true;
      }
    }

    if (!passedValidation) {
      await FailedLookups.updateOne({ osdbHash }, { $inc: { count: 1 }, failedValidation: true }, { upsert: true, setDefaultsOnInsert: true }).exec();
      throw new MediaNotFoundError();
    }
  }

  const parsedOpenSubtitlesResponse = mapper.parseOpenSubtitlesResponse(openSubtitlesResponse);
  const parsedIMDbResponse: MediaMetadataInterface = await externalAPIHelper.getFromIMDbAPI(parsedOpenSubtitlesResponse.imdbID);
  const combinedResponse = _.merge(parsedOpenSubtitlesResponse, parsedIMDbResponse);

  try {
    dbMeta = await MediaMetadata.create(combinedResponse);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ osdbHash }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};

export const getBySanitizedTitle = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { title } = ctx.query;
  const year = ctx.query.year ? Number(ctx.query.year) : null;

  if (!title) {
    throw new ValidationError('title is required');
  }

  // If we already have a result, return it
  const existingResultFromSearchMatch: MediaMetadataInterface = await MediaMetadata.findOne({ searchMatches: { $in: [title] } }, null, { lean: true }).exec();
  if (existingResultFromSearchMatch) {
    return ctx.body = existingResultFromSearchMatch;
  }

  // If we already failed to get a result, return early
  const failedLookupQuery: any = { title };
  if (year) {
    failedLookupQuery.year = year;
  }
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  const searchRequest: SearchRequest = { name: title };
  if (year) {
    searchRequest.year = year;
  }
  const imdbData: MediaMetadataInterface = await externalAPIHelper.getFromIMDbAPI(null, searchRequest);

  if (!imdbData) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  /**
   * If we already have a result based on IMDb ID, return it after adding
   * this new searchMatch to the array.
   */
  const existingIMDbIDResultQuery = { imdbID: imdbData.imdbID };
  const existingResultFromIMDbID: MediaMetadataInterface = await MediaMetadata.findOne(existingIMDbIDResultQuery, null, { lean: true }).exec();
  if (existingResultFromIMDbID) {
    const updatedResult = await MediaMetadata.findOneAndUpdate(
      existingIMDbIDResultQuery,
      { $push: { searchMatches: title } },
      { new: true, lean: true },
    ).exec();
    // @ts-ignore
    return ctx.body = updatedResult;
  }

  if (imdbData.type === 'episode') {
    await externalAPIHelper.setSeriesMetadataByIMDbID(imdbData.seriesIMDbID);
  }

  try {
    imdbData.searchMatches = [title];
    /**
     * The below section is untidy due to the following possible bug https://github.com/Automattic/mongoose/issues/9118
     * Once clarity on the feature, or if a bugfix is released we could refactor the below
     */
    let newlyCreatedResult = await MediaMetadata.create(imdbData);
    // @ts-ignore
    newlyCreatedResult = newlyCreatedResult.toObject();
    delete newlyCreatedResult.searchMatches;
    return ctx.body = newlyCreatedResult;
  } catch (e) {
    console.error(e);
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};

/**
 * Looks up a video by its title, and optionally its year, season and episode number.
 * If it is an episode, it also sets the series data.
 *
 * @param ctx Koa request object
 */
export const getBySanitizedTitleV2 = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { title } = ctx.query;
  const episode = ctx.query.episode ? Number(ctx.query.episode) : null;
  const season = ctx.query.season ? Number(ctx.query.season) : null;
  const year = ctx.query.year ? Number(ctx.query.year) : null;

  if (!title) {
    throw new ValidationError('title is required');
  }

  // If we already have a result, return it
  const existingResultQuery: any = { searchMatches: { $in: [title] } };
  if (year) {
    existingResultQuery.year = year;
  }
  if (episode) {
    existingResultQuery.episode = episode;
  }
  if (season) {
    existingResultQuery.season = season;
  }
  const existingResultFromSearchMatch: MediaMetadataInterface = await MediaMetadata.findOne(existingResultQuery, null, { lean: true }).exec();
  if (existingResultFromSearchMatch) {
    return ctx.body = existingResultFromSearchMatch;
  }

  // If we already failed to get a result, return early
  const failedLookupQuery: any = { title };
  if (year) {
    failedLookupQuery.year = year;
  }
  if (episode) {
    failedLookupQuery.episode = episode;
  }
  if (season) {
    failedLookupQuery.season = season;
  }
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  const searchRequest: SearchRequest = { name: title };
  if (year) {
    searchRequest.year = year;
  }
  const imdbData: MediaMetadataInterface = await externalAPIHelper.getFromIMDbAPIV2(null, searchRequest, season, episode);
  if (!imdbData) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  /**
   * If we already have a result based on IMDb ID, return it after adding
   * this new searchMatch to the array.
   */
  const existingIMDbIDResultQuery = { imdbID: imdbData.imdbID };
  const existingResultFromIMDbID: MediaMetadataInterface = await MediaMetadata.findOne(existingIMDbIDResultQuery, null, { lean: true }).exec();
  if (existingResultFromIMDbID) {
    const updatedResult = await MediaMetadata.findOneAndUpdate(
      existingIMDbIDResultQuery,
      { $push: { searchMatches: title } },
      { new: true, lean: true },
    ).exec();
    // @ts-ignore
    return ctx.body = updatedResult;
  }

  if (imdbData.type === 'episode') {
    await externalAPIHelper.setSeriesMetadataByIMDbID(imdbData.seriesIMDbID);
  }

  try {
    imdbData.searchMatches = [title];
    /**
     * The below section is untidy due to the following possible bug https://github.com/Automattic/mongoose/issues/9118
     * Once clarity on the feature, or if a bugfix is released we could refactor the below
     */
    let newlyCreatedResult = await MediaMetadata.create(imdbData);
    // @ts-ignore
    newlyCreatedResult = newlyCreatedResult.toObject();
    delete newlyCreatedResult.searchMatches;
    return ctx.body = newlyCreatedResult;
  } catch (e) {
    console.error(e);
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  /**
   * @todo OpenSubtitles-api doesn't return complete enough data from
   * its SearchSubtitles function, but we can possibly figure out how to search
   * OpenSubtitles for that fallback data.
   */
};

export const getSeriesByTitle = async(ctx: Context): Promise<SeriesMetadataInterface | string> => {
  let { title: dirOrFilename } = ctx.query;
  const year = ctx.query.year;
  if (!dirOrFilename) {
    throw new ValidationError('title is required');
  }

  let dbMeta: SeriesMetadataInterface = await SeriesMetadata.findSimilarSeries(dirOrFilename, year);
  if (dbMeta) {
    return ctx.body = dbMeta;
  }

  const failedLookupQuery: FailedLookupsInterface = { title: dirOrFilename, type: 'series' };
  if (year) {
    failedLookupQuery.year = year;
  }

  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  const parsed = episodeParser(dirOrFilename);
  dirOrFilename = parsed && parsed.show ? parsed.show : dirOrFilename;
  const searchRequest: SearchRequest = {
    name: dirOrFilename,
    reqtype: 'series',
  };
  if (year) {
    searchRequest.year = year;
  }
  const tvSeriesInfo = await imdbAPI.get(searchRequest);

  if (!tvSeriesInfo) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
  const metadata = mapper.parseIMDBAPISeriesResponse(tvSeriesInfo);
  dbMeta = await SeriesMetadata.create(metadata);
  return ctx.body = dbMeta;
};

export const getByImdbID = async(ctx: Context): Promise<MediaMetadataInterface> => {
  const { imdbid } = ctx.query;

  if (!imdbid) {
    throw new ValidationError('imdbid is required');
  }

  const [mediaMetadata, seriesMetadata] = await Promise.all([
    MediaMetadata.findOne({ imdbID: imdbid }, null, { lean: true }).exec(),
    SeriesMetadata.findOne({ imdbID: imdbid }, null, { lean: true }).exec(),
  ]);

  if (mediaMetadata) {
    return ctx.body = mediaMetadata;
  }

  if (seriesMetadata) {
    return ctx.body = seriesMetadata;
  }

  if (await FailedLookups.findOne({ imdbID: imdbid }, null, { lean: true }).exec()) {
    await FailedLookups.updateOne({ imdbID: imdbid }, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }
  const imdbData: MediaMetadataInterface = await externalAPIHelper.getFromIMDbAPI(imdbid);

  try {
    let dbMeta;
    if (imdbData.type === 'series') {
      dbMeta = await SeriesMetadata.create(imdbData);
    } else {
      dbMeta = await MediaMetadata.create(imdbData);
    }
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ imdbID: imdbid }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};

export const getVideo = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { title, osdbHash, imdbID } = ctx.query;
  let { episode, season, year, filebytesize } = ctx.query;
  [episode, season, year, filebytesize] = [episode, season, year, filebytesize].map(param => param ? Number(param) : null);

  if (!title && !osdbHash && !imdbID) {
    throw new ValidationError('title, osdbHash or imdbId is a required parameter');
  }

  if (osdbHash && !filebytesize) {
    throw new ValidationError('filebytesize is required when passing osdbHash');
  }

  const query = [];
  const failedQuery = [];

  if (osdbHash) {
    query.push({ osdbHash });
    failedQuery.push({ osdbHash });
  }

  if (imdbID) {
    query.push({ imdbID });
    failedQuery.push({ imdbId: imdbID });
  }

  if (title) {
    const titleQuery: any = { searchMatches: { $in: [title] } };
    const titleFailedQuery: any = { title };

    if (year) {
      titleQuery.year = year;
      titleFailedQuery.year = year;
    }
    if (episode) {
      titleQuery.episode = episode;
      titleFailedQuery.episode = episode;
    }
    if (season) {
      titleQuery.season = season;
      titleFailedQuery.season = season;
    }
    query.push(titleQuery);
    failedQuery.push(titleFailedQuery);
  }

  // find an existing metadata record, or previous failure record
  const [existingResult, existingFailedResult] = await Promise.all([
    MediaMetadata.findOne({ $or: query }, null, { lean: true }).exec(),
    FailedLookups.findOne({ $or: failedQuery }, null, { lean: true }).exec(),
  ]);

  // we have an existing metadata record, so return it
  if (existingResult) {
    return ctx.body = existingResult;
  }
  // we have an existing failure record, so increment it, and throw not found error
  if (existingFailedResult) {
    await FailedLookups.updateOne({ _id: existingFailedResult._id }, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  // the database does not have a record of this file, so begin search for metadata on external apis.

  // Start OpenSubtitles lookups
  let openSubtitlesMetadata;

  if (osdbHash && filebytesize) {
    const osQuery = { moviehash: osdbHash, moviebytesize: filebytesize };
    const validation = {
      year: year ? year : null,
      season: season ? season : null,
      episode: episode ? episode : null,
    };
    openSubtitlesMetadata = await externalAPIHelper.getFromOpenSubtitles(osQuery, validation);
    if (!openSubtitlesMetadata) {
      await FailedLookups.updateOne({ osdbHash, imdbID, title, season, episode }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
      throw new MediaNotFoundError();
    }
  }

  // End OpenSubtitles lookups

  /* if the client has passed an imdbId, we'll use that as the primary source, otherwise, the one
  returned by OpenSubtitles */

  // Start omdb lookups
  const omdbSearchRequest = {} as SearchRequest;
  const imdbIdToSearch = imdbID ? imdbID
    : openSubtitlesMetadata?.result?.imdbID ? openSubtitlesMetadata.result.imdbID : null;

  if (title) {
    omdbSearchRequest.name = title;
  }

  if (year) {
    omdbSearchRequest.year = year;
  }

  const imdbData: MediaMetadataInterface = await externalAPIHelper.getFromIMDbAPIV2(imdbIdToSearch, omdbSearchRequest, season, episode);

  if (imdbData?.type === 'episode') {
    await externalAPIHelper.setSeriesMetadataByIMDbID(imdbData.seriesIMDbID);
  }

  // End omdb lookups
  const combinedResponse = _.merge(openSubtitlesMetadata, imdbData);
  if (!combinedResponse || _.isEmpty(combinedResponse)) {
    await FailedLookups.updateOne({ osdbHash, imdbID, title, season, episode }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  try {
    if (title) {
      combinedResponse.searchMatches = [title];
    }

    if (osdbHash) {
      combinedResponse.osdbHash = osdbHash;
    }
    const dbMeta = await MediaMetadata.create(combinedResponse);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ osdbHash, imdbID, title, season, episode }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};
