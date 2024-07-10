import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import { Episode, EpisodeRequest, ExternalId, SearchMovieRequest, SearchTvRequest, SimpleEpisode, TvExternalIdsResponse } from 'moviedb-promise/dist/request-types';

import { tmdb } from './tmdb-api';
import { ValidationError } from '../helpers/customErrors';
import CollectionMetadata, { CollectionMetadataInterface } from '../models/CollectionMetadata';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import LocalizeMetadata, { LocalizeMetadataInterface } from '../models/LocalizeMetadata';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import SeasonMetadata, { SeasonMetadataInterface } from '../models/SeasonMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import { mapper } from '../utils/data-mapper';
import { FlattenMaps, Types } from 'mongoose';
import { raygunClient } from '../app';

const getSeriesTMDBIDFromTMDBAPI = async(imdbID?: string, seriesTitle?: string, language?: string, year?: number): Promise<number> => {
  if (imdbID) {
    const findResult = await tmdb.find({ id: imdbID, external_source: ExternalId.ImdbId });
    // Using any here to make up for missing interface, should submit fix
    if (findResult?.tv_results && findResult?.tv_results[0]) {
      const tvEpisodeResults = findResult.tv_results[0];
      return tvEpisodeResults?.id;
    }
  } else {
    const tmdbQuery: SearchTvRequest = { query: seriesTitle };
    if (year) {
      tmdbQuery.first_air_date_year = year;
    }
    if (language) {
      tmdbQuery.language = language;
    }
    const searchResults = await tmdb.searchTv(tmdbQuery);
    if (searchResults?.results && searchResults.results[0] && searchResults.results[0].id) {
      return searchResults.results[0].id;
    }
  }

  return null;
};

/**
 * Gets series metadata. Performs API lookups if we
 * don't already have it.
 *
 * @param [imdbID] the IMDb ID of the series
 * @param [title] the title of the series
 * @param [language] the language of the query.
 * @param [year] the first year of the series
 * @param [titleToCache] the original title, used for caching if this method is calling itself
 * @returns series metadata
 */
export const getSeriesMetadata = async(
  imdbID?: string,
  title?: string,
  language?: string,
  year?: string,
  titleToCache?: string,
): Promise<FlattenMaps<SeriesMetadataInterface> & { _id: Types.ObjectId; } | null> => {
  if (!imdbID && !title) {
    throw new Error('Either IMDb ID or title required');
  }
  let searchMatch: string;
  if (title) {
    searchMatch = language ? language + '@' + title : title;
  }
  let failedLookupQuery: FailedLookupsInterface;
  let tmdbData: Partial<SeriesMetadataInterface> = {};
  let yearNumber = null;
  if (year) {
    yearNumber = Number(year);
  }

  if (imdbID) {
    failedLookupQuery = { imdbID };
    // We shouldn't have failures since we got this IMDb ID from their API
    if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
      return null;
    }

    const existingSeries = await SeriesMetadata.findOne({ imdbID }, null, { lean: true }).exec();
    if (existingSeries) {
      return existingSeries;
    }

    // Start TMDB lookups
    const seriesID = await getSeriesTMDBIDFromTMDBAPI(imdbID);

    if (seriesID) {
      const seriesRequest = {
        append_to_response: 'images,external_ids,credits',
        id: seriesID,
      };

      const tmdbResponse = await tmdb.tvInfo(seriesRequest);
      tmdbData = mapper.parseTMDBAPISeriesResponse(tmdbResponse);

      /*
       * We matched based on IMDb ID, not title, so we prevent the
       * later code from saving those potentially mismatched values.
       */
      if (tmdbData && !_.isEmpty(tmdbData)) {
        titleToCache = null;
        searchMatch = null;
      }
    }
    // End TMDB lookups
  } else {
    const sortBy = {};
    const titleQuery: GetSeriesFilter = { searchMatches: { $in: [searchMatch] } };
    failedLookupQuery = { title: title, type: 'series' };
    if (language) {
      failedLookupQuery.language = language;
    }
    if (year) {
      failedLookupQuery.startYear = year;
      titleQuery.startYear = year;
    } else {
      sortBy['startYear'] = 1;
    }

    // Return early for previously-failed lookups
    if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();

      // Also store a failed result for the title that the client sent
      if (titleToCache) {
        await FailedLookups.updateOne({ title: titleToCache, type: 'series' }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
      }

      return null;
    }

    // Return any previous match
    const seriesMetadata = await SeriesMetadata.findOne(titleQuery, null, { lean: true }).sort(sortBy)
      .exec();
    if (seriesMetadata) {
      // Also cache the result for the title that the client sent, if this is an automatic re-attempt with an appended year (see below)
      if (titleToCache) {
        raygunClient.send(new Error('Adding titleToCache to searchMatches'), { customData: { seriesMetadata, titleToCache, title, searchMatch } });
        return await SeriesMetadata.findOneAndUpdate(
          { _id: seriesMetadata._id },
          { $addToSet: { searchMatches: titleToCache } },
          { new: true, lean: true },
        ).exec();
      }

      return seriesMetadata;
    }

    // Extract the series name from the incoming string (usually not necessary)
    const parsed = episodeParser(title);
    const parsedTitle = parsed && parsed.show ? parsed.show : title;

    // Start TMDB lookups
    const seriesTMDBID = await getSeriesTMDBIDFromTMDBAPI(null, parsedTitle, language, yearNumber);
    if (seriesTMDBID) {
      // See if we have an existing record for the now-known media.
      const existingResult = await SeriesMetadata.findOne({ tmdbID: seriesTMDBID }, null, { lean: true }).exec();
      if (existingResult) {
        raygunClient.send(new Error('Adding parsedTitle to searchMatches'), { customData: { seriesMetadata, parsedTitle, title, searchMatch } });
        return await SeriesMetadata.findOneAndUpdate(
          { tmdbID: seriesTMDBID },
          { $addToSet: { searchMatches: parsedTitle } },
          { new: true, lean: true },
        ).exec();
      }

      // We do not have an existing record for that series, get the full result from the TMDB API
      const seriesRequest = {
        append_to_response: 'images,external_ids,credits',
        id: seriesTMDBID,
      };

      const tmdbResponse = await tmdb.tvInfo(seriesRequest);
      tmdbData = mapper.parseTMDBAPISeriesResponse(tmdbResponse);
    }
    // End TMDB lookups

    if (!tmdbData && year) {
      /**
       * If the client specified a year, it may have been incorrect because of
       * the way filename parsing works; the filename Galactica.1980.S01E01 might
       * be about a series called "Galactica 1980", or a series called "Galactica"
       * from 1980.
       * So, we attempt the lookup again with the year appended to the title.
       */
      return getSeriesMetadata(null, parsedTitle + ' ' + year, language, parsedTitle);
    }
  }

  if (!tmdbData || _.isEmpty(tmdbData)) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();

    // Also store a failed result for the title that the client sent
    if (titleToCache) {
      failedLookupQuery.title = titleToCache;
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    }

    return null;
  }

  if (searchMatch) {
    tmdbData.searchMatches = [searchMatch];
  }

  raygunClient.send(new Error('Creating new TV series record from title'), { customData: { tmdbData, title, searchMatch } });
  let response = await SeriesMetadata.create(tmdbData);

  // Cache the result for the title that the client sent
  if (titleToCache) {
    tmdbData.searchMatches = tmdbData.searchMatches || [];
    tmdbData.searchMatches.push(titleToCache);
    raygunClient.send(new Error('Creating new TV series record from titleToCache'), { customData: { tmdbData, title, searchMatch, titleToCache } });
    response = await SeriesMetadata.create(tmdbData);
  }

  return response;
};

/**
 * Gets season metadata.
 * Performs API lookups if we don't already have it.
 *
 * @param [tmdbTvID] the TMDB ID of the series
 * @param [seasonNumber] the season number on the series
 * @returns season metadata
 */
export const getSeasonMetadata = async(tmdbTvID?: number, seasonNumber?: number): Promise<Partial<SeasonMetadataInterface> | null> => {
  if (!tmdbTvID && !seasonNumber) {
    throw new Error('Either tmdbTvID or seasonNumber required');
  }

  // Return early for previously-failed lookups
  const failedLookupQuery: FailedLookupsInterface = { tmdbID: tmdbTvID, season: String(seasonNumber), type: 'season' };
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    return null;
  }

  // Return any previous match
  const seasonMetadata = await SeasonMetadata.findOne({ tmdbTvID, seasonNumber }, null, { lean: true }).exec();
  if (seasonMetadata) {
    return seasonMetadata;
  }

  // Start TMDB lookups
  const seasonRequest = {
    append_to_response: 'images,external_ids,credits',
    id: tmdbTvID,
    season_number: seasonNumber,
  };

  const tmdbResponse = await tmdb.seasonInfo(seasonRequest);
  if (tmdbResponse) {
    const metadata = mapper.parseTMDBAPISeasonResponse(tmdbResponse);
    metadata.tmdbTvID = tmdbTvID;
    return await SeasonMetadata.create(metadata);
  } else {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
  }
  return null;
};

/**
 * Gets collection metadata.
 * Performs API lookups if we don't already have it.
 *
 * @param [tmdbID] the TMDB ID of the collection
 * @returns collection metadata
 */
export const getCollectionMetadata = async(tmdbID?: number): Promise<Partial<CollectionMetadataInterface> | null> => {
  if (!tmdbID) {
    throw new Error('tmdbID is required');
  }

  // Return early for previously-failed lookups
  const failedLookupQuery: FailedLookupsInterface = { tmdbID: tmdbID, type: 'collection' };
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
    return null;
  }

  // Return any previous match
  const collectionMetadata = await CollectionMetadata.findOne({ tmdbID }, null, { lean: true }).exec();
  if (collectionMetadata) {
    return collectionMetadata;
  }

  // Start TMDB lookups
  const collectionRequest = {
    append_to_response: 'images',
    id: tmdbID,
  };

  const tmdbResponse = await tmdb.collectionInfo(collectionRequest);
  if (tmdbResponse) {
    const metadata = mapper.parseTMDBAPICollectionResponse(tmdbResponse);
    return await CollectionMetadata.create(metadata);
  } else {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
  }
  return null;
};

/**
 * Attempts a query to the TMDB API and standardizes the response
 * before returning.
 *
 * @param [movieOrSeriesTitle] the title of the movie or series
 * @param [language] the language of the query.
 * @param [movieOrEpisodeIMDbID] the IMDb ID of the movie or episode
 * @param [year] the year of first release
 * @param [seasonNumber] the season number if this is an episode
 * @param [episodeNumber] the episode number if this is an episode
 */
export const getFromTMDBAPI = async(movieOrSeriesTitle?: string, language?: string, movieOrEpisodeIMDbID?: string, year?: number, seasonNumber?: number, episodeNumbers?: number[]): Promise<MediaMetadataInterface | null> => {
  if (!movieOrSeriesTitle && !movieOrEpisodeIMDbID) {
    throw new Error('Either movieOrSeriesTitle or movieOrEpisodeIMDbID must be specified');
  }
  // If the client specified episode number/s, this is episode/s
  const isExpectingTVEpisode = Boolean(episodeNumbers);
  const yearString = year ? year.toString() : null;

  let metadata;
  if (isExpectingTVEpisode) {
    const episodeIMDbID = movieOrEpisodeIMDbID;
    let seriesTMDBID: string | number;
    if (episodeIMDbID) {
      const findResult = await tmdb.find({ id: episodeIMDbID, external_source: ExternalId.ImdbId });
      // Using any here to make up for missing interface, should submit fix
      if (findResult?.tv_episode_results && findResult?.tv_episode_results[0]) {
        const tvEpisodeResult = findResult.tv_episode_results[0] as SimpleEpisode;
        seriesTMDBID = tvEpisodeResult?.show_id;
      }
    } else {
      const seriesMetadata = await getSeriesMetadata(null, movieOrSeriesTitle, language, yearString);
      seriesTMDBID = seriesMetadata?.tmdbID;
    }

    if (!seriesTMDBID) {
      return null;
    }

    for (let i = 0; i < episodeNumbers.length; i++) {
      const episodeRequest: EpisodeRequest = {
        append_to_response: 'images,external_ids,credits',
        episode_number: episodeNumbers[i],
        id: seriesTMDBID,
        season_number: seasonNumber,
      };

      /*
       * Parse the full episode data for the first episode, and
       * append the title for subsequent ones.
       */
      const tmdbData: Episode = await tmdb.episodeInfo(episodeRequest);
      if (tmdbData) {
        if (i === 0) {
          metadata = mapper.parseTMDBAPIEpisodeResponse(tmdbData);
          metadata.tmdbTvID = seriesTMDBID;
          // get series IMDbID
          const tmdbSeriesData: TvExternalIdsResponse = await tmdb.tvExternalIds(seriesTMDBID);
          if (tmdbSeriesData?.imdb_id) {
            metadata.seriesIMDbID = tmdbSeriesData.imdb_id;
          }
        } else {
          metadata.title = metadata.title ? metadata.title + ' & ' + tmdbData.name : tmdbData.name;
        }
      }
    }
  } else {
    const movieIMDbID = movieOrEpisodeIMDbID;

    let movieTMDBID: string | number;
    if (movieIMDbID) {
      const findResult = await tmdb.find({ id: movieIMDbID, external_source: ExternalId.ImdbId });
      // Using any here to make up for missing interface, should submit fix
      if (findResult?.movie_results && findResult?.movie_results[0]) {
        const movieResult = findResult.movie_results[0];
        movieTMDBID = movieResult?.id;
      }
    } else {
      const tmdbQuery: SearchMovieRequest = { query: movieOrSeriesTitle };
      if (year) {
        tmdbQuery.year = year;
      }
      if (language) {
        tmdbQuery.language = language;
      }
      const searchResults = await tmdb.searchMovie(tmdbQuery);
      if (searchResults?.results && searchResults.results[0] && searchResults.results[0].id) {
        movieTMDBID = searchResults.results[0].id;
      }
    }

    if (!movieTMDBID) {
      return null;
    }

    const tmdbData = await tmdb.movieInfo({
      append_to_response: 'images,external_ids,credits',
      id: movieTMDBID,
    });
    if (tmdbData) {
      metadata = mapper.parseTMDBAPIMovieResponse(tmdbData);
    }
  }

  return metadata;
};

/**
 * Gets media localized metadata.
 * Performs TMDB API lookups and standardizes the response before returning.
 *
 * @param [language] the language.
 * @param [mediaType] the media type.
 * @param [imdbID] the IMDb ID of the media.
 * @param [tmdbId] the TMDB movie ID for movie, the TMDB tv ID for tv series, season, episode.
 * @param [season] the season if type is season or episode.
 * @param [episode] the episode if type is episode.
 * @returns series metadata
 */
export const getLocalizedMetadata = async(language?: string, mediaType?: string, imdbID?: string, tmdbID?: number, seasonNumber?: number, episodeNumber?: number): Promise<Partial<LocalizeMetadataInterface> | null> => {
  if (!language || !mediaType || !(imdbID || tmdbID)) {
    throw new ValidationError('Language, media type and either IMDb ID or TMDB Id are required');
  }
  if (!language.match(/^[a-z]{2}(-[A-Z]{2})?$/)) {
    throw new ValidationError('Language must have a minimum length of 2 and follow the pattern: ([a-z]{2})-([A-Z]{2})');
  }
  if (mediaType === 'tv_season' && tmdbID && !seasonNumber) {
    throw new ValidationError('Season number is required for season media');
  }
  if (mediaType === 'tv_episode' && tmdbID && !(seasonNumber && episodeNumber)) {
    throw new ValidationError('Episode number and season number are required for episode media');
  }
  if (mediaType === 'collection' && !tmdbID) {
    throw new ValidationError('TMDB Id is required for collection media');
  }
  if (mediaType !== 'movie' && mediaType !== 'tv' && mediaType !== 'tv_season' && mediaType !== 'tv_episode' && mediaType !== 'collection') {
    throw new ValidationError('Media type' + mediaType + ' is not valid');
  }

  let metadata: Partial<LocalizeMetadataInterface>;

  if (!tmdbID && imdbID) {
    const identifyResult = await getTmdbIdFromIMDbID(imdbID, mediaType);
    if (identifyResult !== null) {
      mediaType = identifyResult.mediaType;
      tmdbID = identifyResult.tmdbID;
      seasonNumber = identifyResult.seasonNumber;
      episodeNumber = identifyResult.episodeNumber;
      // if we are here, that means the request was made without tmdbId.
      // update tmdbId as we do not saved it before.
      if (tmdbID) {
        if (mediaType === 'movie') {
          MediaMetadata.updateOne({ imdbID }, { tmdbID: tmdbID }).exec();
        } else if (mediaType === 'tv_episode') {
          MediaMetadata.updateOne({ imdbID }, { tmdbTvID: tmdbID }).exec();
        }
      }
    }
  }
  if (!tmdbID) {
    return null;
  }
  // Start TMDB lookups
  let tmdbData;
  switch (mediaType) {
    case 'collection':
      tmdbData = await tmdb.collectionInfo({
        id: tmdbID,
        language: language,
      });
      break;
    case 'movie':
      tmdbData = await tmdb.movieInfo({
        id: tmdbID,
        language: language,
        append_to_response: 'external_ids',
      });
      break;
    case 'tv':
      tmdbData = await tmdb.tvInfo({
        id: tmdbID,
        language: language,
        append_to_response: 'external_ids',
      });
      break;
    case 'tv_season':
      tmdbData = await tmdb.seasonInfo({
        id: tmdbID,
        season_number: seasonNumber,
        language: language,
        append_to_response: 'external_ids',
      });
      break;
    case 'tv_episode':
      tmdbData = await tmdb.episodeInfo({
        id: tmdbID,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        language: language,
        append_to_response: 'external_ids',
      });
      break;
    default:
      return null;
  }
  if (tmdbData) {
    metadata = mapper.parseTMDBAPILocalizeResponse(tmdbData);
  }
  if (!metadata || _.isEmpty(metadata)) {
    return null;
  }
  //put back tmdb ID for tv show season and episode
  metadata.tmdbID = tmdbID;
  metadata.language = language;
  metadata.mediaType = mediaType;
  return await LocalizeMetadata.create(metadata);
};

/**
 * Gets TMDB media identified from IMDb ID.
 *
 * @param [imdbID] the IMDb ID of the media.
 * @param [mediaType] the media type, if any.
 * @returns TMDB media identified
 */
export const getTmdbIdFromIMDbID = async(imdbID: string, mediaType?: string): Promise<Partial<TmdbIdentifyResponse>> | null => {
  mediaType = mediaType || '';
  const findResult = await tmdb.find({ id: imdbID, external_source: ExternalId.ImdbId });

  switch (mediaType) {
    case 'movie':
      if (findResult.movie_results && !_.isEmpty(findResult.movie_results)) {
        return mapper.parseTMDBAPIIdentifyResponse(findResult.movie_results[0]);
      }
      break;
    case 'tv':
      if (findResult.tv_results && !_.isEmpty(findResult.tv_results)) {
        return mapper.parseTMDBAPIIdentifyResponse(findResult.tv_results[0]);
      }
      break;
    case 'tv_season':
      // should never happen as IMDb do not store season
      if (findResult.tv_season_results && !_.isEmpty(findResult.tv_season_results)) {
        return mapper.parseTMDBAPIIdentifyTvChildsResponse(findResult.tv_season_results[0]);
      }
      break;
    case 'tv_episode':
      if (findResult.tv_episode_results && !_.isEmpty(findResult.tv_episode_results)) {
        return mapper.parseTMDBAPIIdentifyTvChildsResponse(findResult.tv_episode_results[0]);
      }
      break;
    default:
      // we don't know the type, let try to find it in order movie, tv, episode, season
      if (findResult.movie_results && !_.isEmpty(findResult.movie_results)) {
        return mapper.parseTMDBAPIIdentifyResponse(findResult.movie_results[0]);
      } else if (findResult.tv_results && !_.isEmpty(findResult.tv_results)) {
        return mapper.parseTMDBAPIIdentifyResponse(findResult.tv_results[0]);
      } else if (findResult.tv_episode_results && !_.isEmpty(findResult.tv_episode_results)) {
        return mapper.parseTMDBAPIIdentifyTvChildsResponse(findResult.tv_episode_results[0]);
      } else if (findResult.tv_season_results && !_.isEmpty(findResult.tv_season_results)) {
        return mapper.parseTMDBAPIIdentifyTvChildsResponse(findResult.tv_season_results[0]);
      }
      break;
  }
  return null;
};
