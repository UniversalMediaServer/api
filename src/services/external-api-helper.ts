import { Movie, SearchRequest, TVShow } from '@universalmediaserver/imdb-api';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import { Episode, EpisodeRequest, ExternalId, SearchMovieRequest, SearchTvRequest, TvExternalIdsResponse } from 'moviedb-promise/dist/request-types';
import { jaroWinkler } from '@skyra/jaro-winkler';

import osAPI from './opensubtitles';
import omdbAPI from './omdb-api';
import { tmdb } from './tmdb-api';
import { ValidationError } from '../helpers/customErrors';
import CollectionMetadata, { CollectionMetadataInterface } from '../models/CollectionMetadata';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import LocalizeMetadata, { LocalizeMetadataInterface } from '../models/LocalizeMetadata';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import SeasonMetadata, { SeasonMetadataInterface } from '../models/SeasonMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import { mapper } from '../utils/data-mapper';

export const FAILED_LOOKUP_SKIP_DAYS = 30;

export interface OpenSubtitlesQuery {
  extend: boolean;
  moviebytesize: number;
  moviehash: string;
  remote: boolean;
}

export interface OpenSubtitlesValidation {
  year: string;
  season: string;
  episode: string;
}

/**
 * Adds a searchMatch to an existing result by IMDb ID, and returns the result.
 *
 * @param imdbID the IMDb ID
 * @param searchMatch the title with language if any
 * @returns the updated record
 */
const addSearchMatchByIMDbID = async(imdbID: string, searchMatch: string): Promise<SeriesMetadataInterface> => {
  return SeriesMetadata.findOneAndUpdate(
    { imdbID },
    { $push: { searchMatches: searchMatch } },
    { new: true, lean: true },
  ).exec();
};

/**
 * Attempts a query to the OMDb API and standardizes the response
 * before returning.
 *
 * OMDb does not return goofs, osdbHash, tagline, trivia
 *
 * @param [imdbId] the IMDb ID
 * @param [searchRequest] a query to perform in order to get the imdbId
 * @param [season] the season number if this is an episode
 * @param [episodeNumbers] the episode number/s if this is episode/s
 */
export const getFromOMDbAPIV2 = async(imdbId?: string, searchRequest?: SearchRequest, season?: number, episodeNumbers?: number[]): Promise<MediaMetadataInterface | null> => {
  if (!imdbId && !_.get(searchRequest, 'name')) {
    throw new Error('Either imdbId or searchRequest.name must be specified');
  }
  // If the client specified episode number/s, this is episode/s
  const isExpectingTVEpisode = Boolean(episodeNumbers);

  // We need the IMDb ID for the imdbAPI get request below so here we get it.
  if (!imdbId) {
    if (isExpectingTVEpisode) {
      /**
       * This is a really roundabout way to get info for one episode;
       * it requires that we lookup the series, then lookup each season
       * (one request per season), just to get the imdb of the episode
       * we want. There is a feature request on the module repo but we should
       * consider doing it ourselves if that gets stale.
       *
       * @see https://github.com/worr/node-imdb-api/issues/89
       */
      searchRequest.reqtype = 'series';
      const tvSeriesInfo = await omdbAPI.get(searchRequest);

      if (tvSeriesInfo && tvSeriesInfo instanceof TVShow) {
        const allEpisodes = await tvSeriesInfo.episodes();
        const currentEpisode = _.find(allEpisodes, { season, episode: episodeNumbers[0] });
        if (!currentEpisode) {
          return null;
        }

        imdbId = currentEpisode.imdbid;
      }
    } else {
      searchRequest.reqtype = 'movie';
      const searchResults = await omdbAPI.search(searchRequest);

      if (!searchResults) {
        return null;
      }

      // find the best search results utilising the Jaro-Winkler distance metric
      const searchResultStringDistance = searchResults.results.map(result => jaroWinkler(searchRequest.name, result.title));
      const bestSearchResultKey = _.indexOf(searchResultStringDistance, _.max(searchResultStringDistance));

      const searchResult = searchResults.results[bestSearchResultKey] as Movie;
      if (!searchResult) {
        return null;
      }

      imdbId = searchResult.imdbid;
    }
  }

  if (!imdbId) {
    return null;
  }

  const imdbData = await omdbAPI.get({ id: imdbId });

  if (!imdbData) {
    return null;
  }

  let metadata: any;
  if (isExpectingTVEpisode || imdbData.type === 'episode') {
    if (imdbData.type === 'episode') {
      metadata = mapper.parseOMDbAPIEpisodeResponse(imdbData);
    } else {
      throw new Error('Received type ' + imdbData.type + ' but expected episode for ' + imdbId + ' ' + searchRequest + ' ' + season + ' ' + episodeNumbers);
    }
  } else if (imdbData.type === 'movie') {
    metadata = mapper.parseOMDbAPIMovieResponse(imdbData);
  } else if (imdbData.type === 'series') {
    metadata = mapper.parseOMDbAPISeriesResponse(imdbData);
  } else {
    throw new Error('Received a type we did not expect: ' + imdbData.type);
  }

  return metadata;
};

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
export const getSeriesMetadata = async(imdbID?: string, title?: string, language?: string, year?: string, titleToCache?: string): Promise<Partial<SeriesMetadataInterface> | null> => {
  if (!imdbID && !title) {
    throw new Error('Either IMDb ID or title required');
  }
  let searchMatch: string;
  if (title) {
    searchMatch = language ? language + '@' + title : title;
  }
  let failedLookupQuery: FailedLookupsInterface;
  let omdbData: Partial<SeriesMetadataInterface> = {};
  let tmdbData: Partial<SeriesMetadataInterface> = {};

  if (imdbID) {
    failedLookupQuery = { imdbID };
    // We shouldn't have failures since we got this IMDb ID from their API
    if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
      return null;
    }

    const existingSeries: SeriesMetadataInterface = await SeriesMetadata.findOne({ imdbID }, null, { lean: true }).exec();
    if (existingSeries) {
      const updatedResult = await SeriesMetadata.findOneAndUpdate(
        { imdbID },
        { $push: { searchMatches: searchMatch } },
        { new: true, lean: true },
      ).exec();
      return updatedResult;
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
    }
    // End TMDB lookups

    omdbData = await getFromOMDbAPIV2(imdbID);

    // discard non-series results
    if (omdbData.type && omdbData.type !== 'series') {
      omdbData = {};
    }
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
      // Also cache the result for the title that the client sent
      if (titleToCache) {
        return await SeriesMetadata.findOneAndUpdate(
          { _id: seriesMetadata._id },
          { $push: { searchMatches: titleToCache } },
          { new: true, lean: true },
        ).exec();
      }

      return seriesMetadata;
    }

    // Extract the series name from the incoming string (usually not necessary)
    const parsed = episodeParser(title);
    title = parsed && parsed.show ? parsed.show : title;

    // Start TMDB lookups
    const seriesTMDBID = await getSeriesTMDBIDFromTMDBAPI(null, title, language, Number(year));

    if (seriesTMDBID) {
      const seriesRequest = {
        append_to_response: 'images,external_ids,credits',
        id: seriesTMDBID,
      };

      const tmdbResponse = await tmdb.tvInfo(seriesRequest);
      tmdbData = mapper.parseTMDBAPISeriesResponse(tmdbResponse);
    }
    // End TMDB lookups

    // If we found an IMDb ID from TMDB, see if we have an existing record for the now-known media.
    if (_.get(tmdbData, 'imdbID')) {
      const existingResult = await SeriesMetadata.findOne({ imdbID: tmdbData.imdbID }, null, { lean: true }).exec();
      if (existingResult) {
        return await addSearchMatchByIMDbID(tmdbData.imdbID, title);
      }
    }

    // Start OMDb lookups
    const searchRequest: SearchRequest = {
      name: title,
      reqtype: 'series',
    };
    if (year) {
      searchRequest.year = Number(year);
    }
    const omdbResponse = await omdbAPI.get(searchRequest);

    if (!tmdbData && !omdbResponse && year) {
      /**
       * If the client specified a year, it may have been incorrect because of
       * the way filename parsing works; the filename Galactica.1980.S01E01 might
       * be about a series called "Galactica 1980", or a series called "Galactica"
       * from 1980.
       * So, we attempt the lookup again with the year appended to the title.
       */
      return getSeriesMetadata(null, title + ' ' + year, language, title);
    }
    omdbData = mapper.parseOMDbAPISeriesResponse(omdbResponse);

    // discard non-series results
    if (omdbData.type && omdbData.type !== 'series') {
      omdbData = {};
    }

    // End OMDb lookups

    // If we found an IMDb ID from OMDb, see if we have an existing record for the now-known media.
    if (_.get(omdbData, 'imdbID')) {
      const existingResult = await SeriesMetadata.findOne({ imdbID: omdbData.imdbID }, null, { lean: true }).exec();
      if (existingResult) {
        return await addSearchMatchByIMDbID(omdbData.imdbID, title);
      }
    }
  }

  const combinedResponse = _.merge(omdbData, tmdbData);
  if (!combinedResponse || _.isEmpty(combinedResponse)) {
    await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();

    // Also store a failed result for the title that the client sent
    if (titleToCache) {
      failedLookupQuery.title = titleToCache;
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    }

    return null;
  }

  if (searchMatch) {
    combinedResponse.searchMatches = [searchMatch];
  }

  let response = await SeriesMetadata.create(combinedResponse);

  // Cache the result for the title that the client sent
  if (titleToCache) {
    combinedResponse.searchMatches = combinedResponse.searchMatches || [];
    combinedResponse.searchMatches.push(titleToCache);
    response = await SeriesMetadata.create(combinedResponse);
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

  let metadata: any;
  if (isExpectingTVEpisode) {
    const episodeIMDbID = movieOrEpisodeIMDbID;
    let seriesTMDBID: string | number;
    if (episodeIMDbID) {
      const findResult = await tmdb.find({ id: episodeIMDbID, external_source: ExternalId.ImdbId });
      // Using any here to make up for missing interface, should submit fix
      if (findResult?.tv_episode_results && findResult?.tv_episode_results[0]) {
        const tvEpisodeResult = findResult.tv_episode_results[0] as any;
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
          //get series IMDbID from tmdb as omdb seems to give wrong value
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
    if (identifyResult != null) {
      mediaType = identifyResult.mediaType;
      tmdbID = identifyResult.tmdbID;
      seasonNumber = identifyResult.seasonNumber;
      episodeNumber = identifyResult.episodeNumber;
      //if we are here, that mean the request was made without tmdbId.
      //udpate tmdbId as we do not saved it before.
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
  let tmdbData: any;
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
  
  /**
   * this logging is here temporarily to fix a specific flaky test.
   * If you are reading this and don't recognize it, you can remove it.
   */
  if (process.env.NODE_ENV === 'test') {
    console.log('rawTmdbResult', findResult, mediaType, imdbID);
  }

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
      //should never happend as IMDB do not store season
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
      //we don't know the type, let try to find it in order movie, tv, episode, season
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

/**
 * Gets metadata from Open Subtitles and validates the response if provided validation data
 */
export const getFromOpenSubtitles = async(osQuery: OpenSubtitlesQuery, validationData: OpenSubtitlesValidation): Promise<Partial<MediaMetadataInterface>> => {
  const validateMovieByYear = Boolean(validationData.year);
  const validateEpisodeBySeasonAndEpisode = Boolean(validationData.season && validationData.episode);
  let passedValidation = true;

  if (!osQuery.moviehash || !osQuery.moviebytesize) {
    throw new ValidationError('moviehash and moviebytesize are required');
  }

  const openSubtitlesResponse = await osAPI.identify({ ...osQuery });

  if (!openSubtitlesResponse.metadata) {
    return null;
  }

  if (validateMovieByYear || validateEpisodeBySeasonAndEpisode) {
    passedValidation = false;
    if (validateMovieByYear) {
      if (validationData.year === openSubtitlesResponse.metadata?.year) {
        passedValidation = true;
      }
    }

    if (validateEpisodeBySeasonAndEpisode) {
      if (
        validationData.season === openSubtitlesResponse.metadata.season &&
        validationData.episode === openSubtitlesResponse.metadata.episode
      ) {
        passedValidation = true;
      }
    }
  }

  // If the data from Open Subtitles did not match the search, treat it as a non-result.
  if (!passedValidation) {
    return null;
  }

  if (openSubtitlesResponse.type === 'episode') {
    return mapper.parseOpenSubtitlesEpisodeResponse(openSubtitlesResponse);
  }

  return mapper.parseOpenSubtitlesResponse(openSubtitlesResponse);
};
