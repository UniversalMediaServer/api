import episodeParser from 'episode-parser';

import { LookupFailedInternalError, MediaNotFoundError, ValidationError } from '../../helpers/customErrors';
import FailedLookups, { FailedLookupsInterface } from '../../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../../models/SeriesMetadata';
import * as deprecatedExternalAPIHelper from '../../services/deprecated/external-api-helper';
import { traceLog } from '../../helpers/logging';

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
 * @deprecated since v11
 */
export const getSeries = async(ctx): Promise<SeriesMetadataInterface | MediaMetadataInterface> => {
  const { imdbID, title, year }: UmsQueryParams = ctx.query;
  if (!title && !imdbID) {
    throw new ValidationError('Either IMDb ID or title required');
  }

  let dbMeta;
  try {
    let searchMatch: string;
    let parsedTitle: string;
    if (title) {
      // Extract the series name from the incoming string (usually not necessary)
      const parsed = episodeParser(title);
      parsedTitle = parsed?.show ? parsed.show : title;
      searchMatch = parsedTitle;
    }

    let failedLookupQuery: FailedLookupsInterface;

    if (imdbID) {
      // We shouldn't have failures since we got this IMDb ID from their API
      if (await FailedLookups.findOne({ imdbID }, '_id', { lean: true }).exec()) {
        throw new MediaNotFoundError();
      }

      const existingSeries = await SeriesMetadata.findOne({ imdbID }, null, { lean: true }).exec();
      if (existingSeries) {
        dbMeta = existingSeries;
      }
    } else {
      const sortBy = {};
      const titleQuery: GetSeriesFilter = { searchMatches: { $in: [searchMatch] } };
      failedLookupQuery = { title: parsedTitle, type: 'series' };

      // language was not sent by UMS versions that used this endpoint (< v11)
      failedLookupQuery.language = { $exists: false };

      if (year) {
        failedLookupQuery.startYear = year;
        titleQuery.startYear = year;
      } else {
        sortBy['startYear'] = 1;
      }

      // Return early for previously-failed lookups
      const previousFailedLookup = await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec();
      if (previousFailedLookup) {
        const reason = `getSeriesMetadata found previous failed lookup ${JSON.stringify(failedLookupQuery)}`;
        traceLog(reason);
        throw new MediaNotFoundError();
      }

      // Return any previous match
      traceLog('Looking for TV series in db', { parsedTitle });
      const seriesMetadata = await SeriesMetadata.findOne(titleQuery, null, { lean: true }).sort(sortBy).exec();
      if (seriesMetadata) {
        traceLog('Found TV series', seriesMetadata);
        dbMeta = seriesMetadata;
      }
    }

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
 * @deprecated since v11
 */
export const getVideo = async(ctx): Promise<MediaMetadataInterface> => {
  const { title, imdbID }: UmsQueryParams = ctx.query;
  const { episode, season, year }: UmsQueryParams = ctx.query;

  if (!title && !imdbID) {
    throw new ValidationError('title or imdbId is a required parameter');
  }

  const query = [];
  const failedQuery = [];
  const imdbIdToSearch = imdbID;

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

  throw new MediaNotFoundError();
};
