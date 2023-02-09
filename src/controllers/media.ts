import { SearchRequest } from '@universalmediaserver/imdb-api';
import { ParameterizedContext } from 'koa';
import * as _ from 'lodash';
import { LeanDocument } from 'mongoose';

import { ExternalAPIError, MediaNotFoundError, ValidationError } from '../helpers/customErrors';
import { CollectionMetadataInterface } from '../models/CollectionMetadata';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import LocalizeMetadata, { LocalizeMetadataInterface } from '../models/LocalizeMetadata';
import MediaMetadata, { MediaMetadataInterface, MediaMetadataInterfaceDocument } from '../models/MediaMetadata';
import { SeasonMetadataInterface } from '../models/SeasonMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';
import * as externalAPIHelper from '../services/external-api-helper';
import { OpenSubtitlesQuery } from '../services/external-api-helper';

export const FAILED_LOOKUP_SKIP_DAYS = 30;

/**
 * Adds a searchMatch to an existing result by IMDb ID, and returns the result.
 *
 * @param imdbID the IMDb ID
 * @param title the title
 * @returns the updated record
 */
export const addSearchMatchByIMDbID = async(imdbID: string, title: string): Promise<MediaMetadataInterface> => {
  return MediaMetadata.findOneAndUpdate(
    { imdbID },
    { $push: { searchMatches: title } },
    { new: true, lean: true },
  ).exec();
};

/*
 * Gets localized information from TMDB since it's the only API
 * we use that has that functionality.
 */
export const getLocalize = async(ctx: ParameterizedContext): Promise<Partial<LocalizeMetadataInterface>> => {
  const { language, mediaType, imdbID, tmdbID }: UmsQueryParams = ctx.query;
  const { episode, season }: UmsQueryParams = ctx.query;
  let seasonNumber: number|undefined;
  if (season) {
    seasonNumber = Number(season);
  }

  if (!language || !mediaType || !(imdbID || tmdbID)) {
    throw new ValidationError('Language, media type and either IMDb ID or TMDB ID are required');
  }
  if (!language.match(/^[a-z]{2}(-[A-Z]{2})?$/)) {
    throw new ValidationError('Language must have a minimum length of 2 and follow the pattern: ([a-z]{2})-([A-Z]{2})');
  }

  if (mediaType !== 'collection' && mediaType !== 'movie' && mediaType !== 'tv' && mediaType !== 'tv_season' && mediaType !== 'tv_episode') {
    throw new ValidationError('Media type' + mediaType + ' is not valid');
  }
  if (mediaType === 'collection' && !tmdbID) {
    throw new ValidationError('TMDB Id is required for collection media');
  }
  if (mediaType === 'tv_season' && tmdbID && (!seasonNumber || isNaN(seasonNumber))) {
    throw new ValidationError('Season number is required for season media');
  }
  if (mediaType === 'tv_episode' && tmdbID && (!seasonNumber || isNaN(seasonNumber) || !episode)) {
    throw new ValidationError('Episode number and season number are required for episode media');
  }

  const failedLookupQuery: FailedLookupsInterface = { language, type: mediaType, imdbID, tmdbID, season, episode };
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    return null;
  }

  let episodeNumber = null;
  if (episode) {
    const episodes = episode.split('-');
    episodeNumber = Number(episodes[0]);
  }
  if (tmdbID) {
    const existingLocalize: LocalizeMetadataInterface = await LocalizeMetadata.findOne({ language, mediaType, tmdbID, seasonNumber, episodeNumber }, null, { lean: true }).exec();
    if (existingLocalize) {
      return ctx.body = existingLocalize;
    }
  }

  if (imdbID) {
    const existingLocalize: LocalizeMetadataInterface = await LocalizeMetadata.findOne({ language, mediaType, imdbID }, null, { lean: true }).exec();
    if (existingLocalize) {
      return ctx.body = existingLocalize;
    }
  }

  try {
    const findResult = await externalAPIHelper.getLocalizedMetadata(language, mediaType, imdbID, tmdbID, seasonNumber, episodeNumber);
    if (!findResult) {
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
      throw new MediaNotFoundError();
    }
    return ctx.body = findResult;
  } catch (err) {
    if (!(err instanceof MediaNotFoundError)) {
      console.error(err);
    }
    throw new MediaNotFoundError();
  }
};

export const getSeriesV2 = async(ctx: ParameterizedContext): Promise<Partial<SeriesMetadataInterface> | LeanDocument<MediaMetadataInterfaceDocument>> => {
  const { imdbID, title, year }: UmsQueryParams = ctx.query;
  let { language }: UmsQueryParams = ctx.query;
  if (!title && !imdbID) {
    throw new ValidationError('Either IMDb ID or title required');
  }

  if (language && !language.match(/^[a-z]{2}(-[A-Z]{2})?$/)) {
    language = undefined;
  }

  try {
    const dbMeta = await externalAPIHelper.getSeriesMetadata(imdbID, title, language, year);
    if (!dbMeta) {
      throw new MediaNotFoundError();
    }

    return ctx.body = dbMeta;
  } catch (err) {
    // log unexpected errors
    if (!(err instanceof MediaNotFoundError)) {
      console.error(err);
    }
    throw new MediaNotFoundError();
  }
};

/*
 * Gets season information from TMDB since it's the only API
 * we use that has that functionality.
 */
export const getSeason = async(ctx: ParameterizedContext): Promise<Partial<SeasonMetadataInterface>> => {
  const { season, title, year }: UmsQueryParams = ctx.query;
  let { tmdbID, language }: UmsQueryParams = ctx.query
  if (!tmdbID && !title) {
    throw new ValidationError('title or tmdbID is required');
  }
  if (!season) {
    throw new ValidationError('season is required');
  }
  const seasonNumber = Number(season);
  if (isNaN(seasonNumber)) {
    throw new ValidationError('season as a number is required');
  }
  if (language && !language.match(/^[a-z]{2}(-[A-Z]{2})?$/)) {
    language = undefined;
  }

  try {
    if (!tmdbID) {
      const seriesMetadata = await externalAPIHelper.getSeriesMetadata(null, title, language, year);
      if (!seriesMetadata?.tmdbID) {
        throw new MediaNotFoundError();
      }
      tmdbID = seriesMetadata.tmdbID;
    }

    const seasonMetadata = await externalAPIHelper.getSeasonMetadata(tmdbID, seasonNumber);
    if (_.isEmpty(seasonMetadata)) {
      throw new MediaNotFoundError();
    }
    return ctx.body = seasonMetadata;
  } catch (err) {
    // log unexpected errors
    if (!(err instanceof MediaNotFoundError)) {
      console.error(err);
    }
    throw new MediaNotFoundError();
  }
};

/*
 * Gets collection information from TMDB since it's the only API
 * we use that has that functionality.
 */
export const getCollection = async(ctx: ParameterizedContext): Promise<Partial<CollectionMetadataInterface>> => {
  const { tmdbID }: UmsQueryParams = ctx.query;
  if (!tmdbID) {
    throw new ValidationError('tmdbID is required');
  }

  try {
    const collectionMetadata = await externalAPIHelper.getCollectionMetadata(tmdbID);
    if (_.isEmpty(collectionMetadata)) {
      throw new MediaNotFoundError();
    }
    return ctx.body = collectionMetadata;
  } catch (err) {
    // log unexpected errors
    if (!(err instanceof MediaNotFoundError)) {
      console.error(err);
    }
    throw new MediaNotFoundError();
  }
};

export const getVideoV2 = async(ctx: ParameterizedContext): Promise<MediaMetadataInterface> => {
  const { title, osdbHash, imdbID }: UmsQueryParams = ctx.query;
  const { episode, season, year, filebytesize }: UmsQueryParams = ctx.query;
  let { language }: UmsQueryParams = ctx.query;
  const [yearNumber, filebytesizeNumber] = [year, filebytesize].map(param => param ? Number(param) : null);
  let seasonNumber = Number(season);
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

  if (language && !language.match(/^[a-z]{2}(-[A-Z]{2})?$/)) {
    language = undefined;
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

  let searchMatch: string;
  if (title) {
    searchMatch = language ? language + '@' + title : title;
    const titleQuery: GetVideoFilter = { searchMatches: { $in: [searchMatch] } };
    const titleFailedQuery: FailedLookupsInterface = { title };

    if (language) {
      titleFailedQuery.language = language;
    }
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
      if (!title && !imdbID && !episodeNumbers && openSubtitlesMetadata?.type === 'episode') {
        //here we know the osdbHash is for an episode and episode is not set
        episodeNumbers = [Number(openSubtitlesMetadata.episode)];
        seasonNumber = Number(openSubtitlesMetadata.season);
      }
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
    const existingResult = await MediaMetadata.findOne({ imdbID: imdbIdToSearch }, null, { lean: true }).exec();
    if (existingResult) {
      return ctx.body = await addSearchMatchByIMDbID(imdbIdToSearch, searchMatch);
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
    tmdbData = await externalAPIHelper.getFromTMDBAPI(title, language, imdbIdToSearch, yearNumber, seasonNumber, episodeNumbers);
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
    const existingResult = await MediaMetadata.findOne({ imdbID: imdbIdToSearch }, null, { lean: true }).exec();
    if (existingResult) {
      return ctx.body = await addSearchMatchByIMDbID(imdbIdToSearch, searchMatch);
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
    const existingResult = await MediaMetadata.findOne({ imdbID: imdbIdToSearch }, null, { lean: true }).exec();
    if (existingResult) {
      return ctx.body = await addSearchMatchByIMDbID(imdbIdToSearch, searchMatch);
    }
  }
  // End OMDb lookups

  const combinedResponse = _.merge(openSubtitlesMetadata, omdbData, tmdbData);
  if (!combinedResponse || _.isEmpty(combinedResponse)) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  try {
    if (searchMatch) {
      combinedResponse.searchMatches = [searchMatch];
    }

    if (osdbHash) {
      combinedResponse.osdbHash = osdbHash;
    }

    // Ensure that we return and cache the same episode number that was searched for
    if (episode && episodeNumbers && episodeNumbers.length > 1 && episodeNumbers[0] === combinedResponse.episode) {
      combinedResponse.episode = episode;
    }

    const dbMeta = await MediaMetadata.create(combinedResponse);

    // TODO: Investigate why we need this "as" syntax
    const leanMeta = dbMeta.toObject({ useProjection: true }) as MediaMetadataInterface;
    return ctx.body = leanMeta;
  } catch (e) {
    console.error(e,combinedResponse);
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};
