import { SearchRequest } from '@universalmediaserver/node-imdb-api';
import { ParameterizedContext } from 'koa';
import * as _ from 'lodash';
import { LeanDocument } from 'mongoose';

import { ExternalAPIError, MediaNotFoundError, ValidationError } from '../helpers/customErrors';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface, MediaMetadataInterfaceDocument } from '../models/MediaMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';
import * as externalAPIHelper from '../services/external-api-helper';
import { mapper } from '../utils/data-mapper';
import { OpenSubtitlesQuery } from '../services/external-api-helper';
import SeasonMetadata, { SeasonMetadataInterface } from '../models/SeasonMetadata';
import { tmdb } from '../services/tmdb-api';

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

    const dbMetaWithPosters = await externalAPIHelper.addPosterFromImages(dbMeta);
    return ctx.body = dbMetaWithPosters;
  } catch (err) {
    console.error(err);
    throw new MediaNotFoundError();
  }
};

/*
 * Gets season information from TMDB since it's the only API
 * we use that has that functionality.
 */
export const getSeason = async(ctx: ParameterizedContext): Promise<SeasonMetadataInterface> => {
  const { season, title, year }: UmsQueryParams = ctx.query;
  if (!title || !season) {
    throw new ValidationError('title and season are required');
  }
  const seasonNumber = Number(season);

  // Return early for previously-failed lookups
  const failedLookupQuery: FailedLookupsInterface = { title, season, type: 'season' };
  if (year) {
    failedLookupQuery.year = year;
  }
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    throw new MediaNotFoundError();
  }

  const seriesMetadata = await externalAPIHelper.getSeriesMetadata(null, title, year);
  if (!seriesMetadata?.tmdbID) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  // Start TMDB lookups
  const seasonRequest = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    append_to_response: 'images,external_ids,credits',
    id: seriesMetadata.tmdbID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    season_number: seasonNumber,
  };

  const tmdbResponse = await tmdb.seasonInfo(seasonRequest);
  const tmdbData = mapper.parseTMDBAPISeasonResponse(tmdbResponse);
  // End TMDB lookups

  if (_.isEmpty(tmdbData)) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  const seasonMetadata = await SeasonMetadata.create(tmdbData);
  return ctx.body = seasonMetadata;
};

export const getVideo = async(ctx: ParameterizedContext): Promise<MediaMetadataInterface> => {
  const { title, osdbHash, imdbID }: UmsQueryParams = ctx.query;
  const { episode, season, year, filebytesize }: UmsQueryParams = ctx.query;
  const [episodeNumber, seasonNumber, yearNumber, filebytesizeNumber] = [episode, season, year, filebytesize].map(param => param ? Number(param) : null);

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
    if (episodeNumber) {
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
    tmdbData = await externalAPIHelper.getFromTMDBAPI(title, imdbIdToSearch, yearNumber, seasonNumber, episodeNumber);
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
    omdbData = await externalAPIHelper.getFromOMDbAPIV2(imdbIdToSearch, omdbSearchRequest, seasonNumber, episodeNumber);
    imdbIdToSearch = imdbIdToSearch || omdbData?.imdbID;
  } catch (e) {
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
    const dbMeta = await MediaMetadata.create(combinedResponse);

    // TODO: Investigate why we need this "as" syntax
    let leanMeta = dbMeta.toObject({ useProjection: true }) as MediaMetadataInterface;
    leanMeta = await externalAPIHelper.addPosterFromImages(leanMeta);
    return ctx.body = leanMeta;
  } catch (e) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};
