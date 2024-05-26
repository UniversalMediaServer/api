import * as _ from 'lodash';

import { MediaNotFoundError, ValidationError } from '../../helpers/customErrors';
import FailedLookups, { FailedLookupsInterface } from '../../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../../models/SeriesMetadata';
import * as externalAPIHelper from '../../services/external-api-helper';
import * as deprecatedExternalAPIHelper from '../../services/deprecated/external-api-helper';
import { addSearchMatchByIMDbID } from '../media';

/**
 * We aren't connected to OpenSubtitles API anymore so this can never succeed
 *
 * @deprecated
 */
export const getByOsdbHash = async(ctx): Promise<MediaMetadataInterface> => {
  throw new MediaNotFoundError();
};

/**
 * Since this is deprecated, it will only return a result that has been created
 * by the newer route. This will never add new information to the database.
 *
 * @deprecated
 */
export const getBySanitizedTitle = async(ctx): Promise<MediaMetadataInterface> => {
  const { title }: UmsQueryParams = ctx.query;

  if (!title) {
    throw new ValidationError('title is required');
  }

  // If we already have a result, return it
  const existingResultFromSearchMatch: MediaMetadataInterface = await MediaMetadata.findOne({ searchMatches: { $in: [title] } }, null, { lean: true }).exec();
  if (existingResultFromSearchMatch) {
    return ctx.body = existingResultFromSearchMatch;
  }

  throw new MediaNotFoundError();
};

/**
 * Looks up a video by its title, and optionally its year, season and episode number.
 * If it is an episode, it also sets the series data.
 *
 * Since this is deprecated, it will only return a result that has been created
 * by the newer route. This will never add new information to the database.
 *
 * @deprecated
 */
export const getBySanitizedTitleV2 = async(ctx): Promise<MediaMetadataInterface> => {
  const { episode, title }: UmsQueryParams = ctx.query;
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

  throw new MediaNotFoundError();
};

/**
 * @deprecated
 */
export const getByImdbID = async(ctx): Promise<MediaMetadataInterface | SeriesMetadataInterface> => {
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

  throw new MediaNotFoundError();
};

/**
 * @deprecated
 */
export const getSeries = async(ctx): Promise<SeriesMetadataInterface | MediaMetadataInterface> => {
  const { imdbID, title, year }: UmsQueryParams = ctx.query;
  if (!title && !imdbID) {
    throw new ValidationError('Either IMDb ID or title required');
  }

  try {
    const dbMeta = await externalAPIHelper.getSeriesMetadata(imdbID, title, null, year);
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
export const getVideo = async(ctx): Promise<MediaMetadataInterface> => {
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

  const failedLookupQuery = { episode, imdbID, osdbHash, season, title, year };

  if (!title && !imdbIdToSearch) {
    // The APIs below require either a title or IMDb ID, so return if we don't have one
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  // Start TMDB lookups
  let tmdbData: MediaMetadataInterface;
  try {
    tmdbData = await externalAPIHelper.getFromTMDBAPI(title, null, imdbIdToSearch, yearNumber, seasonNumber, episodeNumbers);
    imdbIdToSearch = imdbIdToSearch || tmdbData?.imdbID;
  } catch (e) {
    // Log the error but continue
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

  if (!tmdbData || _.isEmpty(tmdbData)) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  try {
    if (title) {
      tmdbData.searchMatches = [title];
    }

    if (osdbHash) {
      tmdbData.osdbHash = osdbHash;
    }

    // Ensure that we return and cache the same episode number that was searched for
    if (episodeNumbers && episodeNumbers.length > 1 && episodeNumbers[0] === tmdbData.episode) {
      tmdbData.episode = episode;
    }

    const dbMeta = await MediaMetadata.create(tmdbData);

    // TODO: Investigate why we need this "as" syntax
    let leanMeta = dbMeta.toObject({ useProjection: true }) as MediaMetadataInterface;
    leanMeta = await deprecatedExternalAPIHelper.addPosterFromImages(leanMeta);
    return ctx.body = leanMeta;
  } catch (e) {
    console.error(e,tmdbData);
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};
