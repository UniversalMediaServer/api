import { SearchRequest } from '@universalmediaserver/node-imdb-api';
import { ParameterizedContext } from 'koa';
import * as _ from 'lodash';

import { MediaNotFoundError, ValidationError } from '../../helpers/customErrors';
import FailedLookups from '../../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../../models/SeriesMetadata';
import osAPI from '../../services/opensubtitles';
import * as externalAPIHelper from '../../services/external-api-helper';
import * as deprecatedExternalAPIHelper from '../../services/deprecated/external-api-helper';
import { mapper } from '../../utils/data-mapper';
import { OpenSubtitlesQuery } from '../../services/external-api-helper';
import { addSearchMatchByIMDbID } from '../media';

export const FAILED_LOOKUP_SKIP_DAYS = 30;

/**
 * @deprecated
 */
export const getByOsdbHash = async(ctx: ParameterizedContext): Promise<MediaMetadataInterface> => {
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

  const osQuery: OpenSubtitlesQuery = {
    moviehash: osdbHash,
    moviebytesize: parseInt(filebytesize),
    extend: true,
    remote: true,
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
  const parsedIMDbResponse: MediaMetadataInterface = await deprecatedExternalAPIHelper.getFromOMDbAPI(parsedOpenSubtitlesResponse.imdbID);
  const combinedResponse = _.merge(parsedOpenSubtitlesResponse, parsedIMDbResponse);

  try {
    dbMeta = await MediaMetadata.create(combinedResponse);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ osdbHash }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};

/**
 * @deprecated
 */
export const getBySanitizedTitle = async(ctx: ParameterizedContext): Promise<MediaMetadataInterface> => {
  const { title }: UmsQueryParams = ctx.query;
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
  const failedLookupQuery: GetVideoFilter = { title };
  if (year) {
    failedLookupQuery.year = year.toString();
  }
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  const searchRequest: SearchRequest = { name: title };
  if (year) {
    searchRequest.year = year;
  }
  const imdbData: MediaMetadataInterface = await deprecatedExternalAPIHelper.getFromOMDbAPI(null, searchRequest);

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
    // @ts-ignore
    return ctx.body = await addSearchMatchByIMDbID(imdbData.imdbID, title);
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
 * @deprecated
 */
export const getBySanitizedTitleV2 = async(ctx: ParameterizedContext): Promise<MediaMetadataInterface> => {
  const { title }: UmsQueryParams = ctx.query;
  const episode = ctx.query.episode ? Number(ctx.query.episode) : null;
  const season = ctx.query.season ? Number(ctx.query.season) : null;
  const year = ctx.query.year ? Number(ctx.query.year) : null;

  if (!title) {
    throw new ValidationError('title is required');
  }

  // If we already have a result, return it
  const existingResultQuery: GetVideoFilter = { searchMatches: { $in: [title] } };
  if (year) {
    existingResultQuery.year = year.toString();
  }
  if (episode) {
    existingResultQuery.episode = episode.toString();
  }
  if (season) {
    existingResultQuery.season = season.toString();
  }
  const existingResultFromSearchMatch: MediaMetadataInterface = await MediaMetadata.findOne(existingResultQuery, null, { lean: true }).exec();
  if (existingResultFromSearchMatch) {
    return ctx.body = existingResultFromSearchMatch;
  }

  // If we already failed to get a result, return early
  const failedLookupQuery: GetVideoFilter = { title };
  if (year) {
    failedLookupQuery.year = year.toString();
  }
  if (episode) {
    failedLookupQuery.episode = episode.toString();
  }
  if (season) {
    failedLookupQuery.season = season.toString();
  }
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  const searchRequest: SearchRequest = { name: title };
  if (year) {
    searchRequest.year = year;
  }
  let imdbData: MediaMetadataInterface;
  try {
    imdbData = await externalAPIHelper.getFromOMDbAPIV2(null, searchRequest, season, episode);
  } catch (e) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

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

/**
 * @deprecated
 */
export const getByImdbID = async(ctx: ParameterizedContext): Promise<MediaMetadataInterface | SeriesMetadataInterface> => {
  const { imdbid }: UmsQueryParams = ctx.query;

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
  const imdbData: MediaMetadataInterface = await deprecatedExternalAPIHelper.getFromOMDbAPI(imdbid);

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
