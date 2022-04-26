import { SearchRequest } from '@universalmediaserver/node-imdb-api';
import { ParameterizedContext } from 'koa';
import * as _ from 'lodash';
import { LeanDocument } from 'mongoose';

import { ExternalAPIError, MediaNotFoundError, ValidationError } from '../../helpers/customErrors';
import FailedLookups, { FailedLookupsInterface } from '../../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface, MediaMetadataInterfaceDocument } from '../../models/MediaMetadata';
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
  const failedLookupQuery: FailedLookupsInterface = { title };
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
  const existingResultFromIMDbID: MediaMetadataInterface = await MediaMetadata.findOne({ imdbID: imdbData.imdbID }, null, { lean: true }).exec();
  if (existingResultFromIMDbID) {
    return ctx.body = await addSearchMatchByIMDbID(imdbData.imdbID, title);
  }

  try {
    imdbData.searchMatches = [title];

    let newlyCreatedResult = await MediaMetadata.create(imdbData);
    // @ts-expect-error these types get confused because of lean results
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
  const { episode, title }: UmsQueryParams = ctx.query;
  const season = ctx.query.season ? Number(ctx.query.season) : null;
  const year = ctx.query.year ? Number(ctx.query.year) : null;

  let episodeNumbers = null;
  if (episode) {
    const episodes = episode.split('-');
    episodeNumbers = episodes.map(Number);
  }

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
  const failedLookupQuery: FailedLookupsInterface = { title };
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
    imdbData = await externalAPIHelper.getFromOMDbAPIV2(null, searchRequest, season, episodeNumbers);
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
  const existingResultFromIMDbID: MediaMetadataInterface = await MediaMetadata.findOne({ imdbID: imdbData.imdbID }, null, { lean: true }).exec();
  if (existingResultFromIMDbID) {
    const updatedResult = await addSearchMatchByIMDbID(imdbData.imdbID, title);
    return ctx.body = updatedResult;
  }

  try {
    imdbData.searchMatches = [title];

    // Ensure that we return and cache the same episode number that was searched for
    if (episodeNumbers && episodeNumbers.length > 1 && episodeNumbers[0] === imdbData.episode) {
      imdbData.episode = episode;
    }

    let newlyCreatedResult = await MediaMetadata.create(imdbData);
    // @ts-expect-error these types get confused because of lean results
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

/**
 * @deprecated
 */
export const getSeries = async(ctx: ParameterizedContext): Promise<SeriesMetadataInterface | LeanDocument<MediaMetadataInterfaceDocument>> => {
  const { imdbID, title, year }: UmsQueryParams = ctx.query;
  if (!title && !imdbID) {
    throw new ValidationError('Either IMDb ID or title required');
  }

  try {
    const dbMeta = await externalAPIHelper.getSeriesMetadata(imdbID, title, year);
    if (!dbMeta) {
      throw new MediaNotFoundError();
    }

    const dbMetaWithPosters = await deprecatedExternalAPIHelper.addPosterFromImages(dbMeta);
    return ctx.body = dbMetaWithPosters;
  } catch (err) {
    // log unexpected errors
    if (!(err instanceof MediaNotFoundError)) {
      console.error(err);
    }
    throw new MediaNotFoundError();
  }
};

/**
 * @deprecated
 */
export const getVideo = async(ctx: ParameterizedContext): Promise<MediaMetadataInterface> => {
  const { title, osdbHash, imdbID }: UmsQueryParams = ctx.query;
  const { episode, season, year, filebytesize }: UmsQueryParams = ctx.query;
  const [seasonNumber, yearNumber, filebytesizeNumber] = [season, year, filebytesize].map(param => param ? Number(param) : null);
  let episodeNumbers = null;
  if (episode) {
    const episodes = episode.split('-');
    episodeNumbers = episodes.map(Number);
  }

  if (!title && !osdbHash && !imdbID) {
    throw new ValidationError('title, osdbHash or imdbId is a required parameter');
  }

  if (osdbHash && !filebytesize) {
    throw new ValidationError('filebytesize is required when passing osdbHash');
  }

  const query = [];
  const failedQuery = [];
  let imdbIdToSearch = imdbID;

  if (osdbHash) {
    query.push({ osdbHash });
    failedQuery.push({ osdbHash });
  }

  if (imdbIdToSearch) {
    query.push({ imdbID: imdbIdToSearch });
    failedQuery.push({ imdbId: imdbIdToSearch });
  }

  if (title) {
    const titleQuery: GetVideoFilter = { searchMatches: { $in: [title] } };
    const titleFailedQuery: FailedLookupsInterface = { title };

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

  const existingResult = await MediaMetadata.findOne({ $or: query }, null, { lean: true }).exec();
  if (existingResult) {
    // we have an existing metadata record, so return it
    return ctx.body = existingResult;
  }

  const existingFailedResult = await FailedLookups.findOne({ $or: failedQuery }, null, { lean: true }).exec();
  if (existingFailedResult) {
    // we have an existing failure record, so increment it, and throw not found error
    await FailedLookups.updateOne({ _id: existingFailedResult._id }, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  // the database does not have a record of this file, so begin search for metadata on external apis.

  // Start OpenSubtitles lookups
  let openSubtitlesMetadata: Partial<MediaMetadataInterface>;
  if (osdbHash && filebytesize) {
    const osQuery: OpenSubtitlesQuery = { moviehash: osdbHash, moviebytesize: filebytesizeNumber, extend: true, remote: true };
    const validation = {
      year: year ? year : null,
      season: season ? season : null,
      episode: episode ? episode : null,
    };

    try {
      openSubtitlesMetadata = await externalAPIHelper.getFromOpenSubtitles(osQuery, validation);
      imdbIdToSearch = imdbIdToSearch || openSubtitlesMetadata?.imdbID;
    } catch (e) {
      // Rethrow errors except if they are about Open Subtitles being offline. as that happens a lot
      if (!(e instanceof ExternalAPIError)) {
        console.error(e);
        throw e;
      }
    }
  }

  // if the client did not pass an imdbID, but we found one on Open Subtitles, see if we have an existing record for the now-known media.
  if (!imdbID && imdbIdToSearch) {
    {
      const existingResult = await MediaMetadata.findOne({ imdbID: imdbIdToSearch }, null, { lean: true }).exec();
      if (existingResult) {
        return ctx.body = await addSearchMatchByIMDbID(imdbIdToSearch, title);
      }
    }
  }
  // End OpenSubtitles lookups

  const failedLookupQuery = { episode, imdbID, osdbHash, season, title, year };

  if (!title && !imdbIdToSearch) {
    // The APIs below require either a title or IMDb ID, so return if we don't have one
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  // Start TMDB lookups
  let tmdbData: MediaMetadataInterface;
  try {
    tmdbData = await externalAPIHelper.getFromTMDBAPI(title, imdbIdToSearch, yearNumber, seasonNumber, episodeNumbers);
    imdbIdToSearch = imdbIdToSearch || tmdbData?.imdbID;
  } catch (e) {
    // Log the error but continue on to try the next API, OMDb
    if (e.message && e.message.includes('404') && e.response?.config?.url) {
      console.log('Received 404 response from ' + e.response.config.url);
    } else {
      console.log(e);
    }
  }

  // if the client did not pass an imdbID, but we found one on TMDB, see if we have an existing record for the now-known media.
  if (!imdbID && imdbIdToSearch) {
    {
      const existingResult = await MediaMetadata.findOne({ imdbID: imdbIdToSearch }, null, { lean: true }).exec();
      if (existingResult) {
        return ctx.body = await addSearchMatchByIMDbID(imdbIdToSearch, title);
      }
    }
  }
  // End TMDB lookups

  // Start OMDb lookups
  const omdbSearchRequest = {} as SearchRequest;

  if (title) {
    omdbSearchRequest.name = title;
  }

  if (year) {
    omdbSearchRequest.year = yearNumber;
  }

  let omdbData: MediaMetadataInterface;
  try {
    omdbData = await externalAPIHelper.getFromOMDbAPIV2(imdbIdToSearch, omdbSearchRequest, seasonNumber, episodeNumbers);
    imdbIdToSearch = imdbIdToSearch || omdbData?.imdbID;
  } catch (e) {
    console.error(e);
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  /*
   * If the client did not pass an imdbID, and did not
   * find it on Open Subtitles or TMDB, but we found one
   * from OMDb, see if we have an existing record for
   * the now-known media.
   */
  if (!imdbID && imdbIdToSearch) {
    {
      const existingResult = await MediaMetadata.findOne({ imdbID: imdbIdToSearch }, null, { lean: true }).exec();
      if (existingResult) {
        return ctx.body = await addSearchMatchByIMDbID(imdbIdToSearch, title);
      }
    }
  }
  // End OMDb lookups

  const combinedResponse = _.merge(openSubtitlesMetadata, omdbData, tmdbData);
  if (!combinedResponse || _.isEmpty(combinedResponse)) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  try {
    if (title) {
      combinedResponse.searchMatches = [title];
    }

    if (osdbHash) {
      combinedResponse.osdbHash = osdbHash;
    }

    // Ensure that we return and cache the same episode number that was searched for
    if (episodeNumbers && episodeNumbers.length > 1 && episodeNumbers[0] === combinedResponse.episode) {
      combinedResponse.episode = episode;
    }

    const dbMeta = await MediaMetadata.create(combinedResponse);

    // TODO: Investigate why we need this "as" syntax
    let leanMeta = dbMeta.toObject({ useProjection: true }) as MediaMetadataInterface;
    leanMeta = await deprecatedExternalAPIHelper.addPosterFromImages(leanMeta);
    return ctx.body = leanMeta;
  } catch (e) {
    console.error(e,combinedResponse);
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};
