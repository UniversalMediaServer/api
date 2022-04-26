import { Movie, SearchRequest, TVShow } from '@universalmediaserver/node-imdb-api';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import * as natural from 'natural';

import osAPI from './opensubtitles';

import { ValidationError } from '../helpers/customErrors';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import omdbAPI from './omdb-api';
import { mapper } from '../utils/data-mapper';
import { Episode, EpisodeRequest, ExternalId, SearchMovieRequest, SearchTvRequest } from 'moviedb-promise/dist/request-types';
import { tmdb } from './tmdb-api';

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

interface SortByFilter {
  startYear: number;
}

/**
 * Adds a searchMatch to an existing result by IMDb ID, and returns the result.
 *
 * @param imdbID the IMDb ID
 * @param title the title
 * @returns the updated record
 */
const addSearchMatchByIMDbID = async(imdbID: string, title: string): Promise<SeriesMetadataInterface> => {
  return SeriesMetadata.findOneAndUpdate(
    { imdbID },
    { $push: { searchMatches: title } },
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
      const searchResultStringDistance = searchResults.results.map(result => natural.JaroWinklerDistance(searchRequest.name, result.title));
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

  let metadata;
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

const getSeriesTMDBIDFromTMDBAPI = async(imdbID?: string, seriesTitle?: string, year?: number): Promise<number> => {
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
 * @param [year] the first year of the series
 * @param [titleToCache] the original title, used for caching if this method is calling itself
 * @returns series metadata
 */
export const getSeriesMetadata = async(imdbID?: string, title?: string, year?: string, titleToCache?: string): Promise<SeriesMetadataInterface | null> => {
  if (!imdbID && !title) {
    throw new Error('Either IMDb ID or title required');
  }

  let failedLookupQuery: FailedLookupsInterface;
  let omdbData: Partial<SeriesMetadataInterface>;
  let tmdbData: Partial<SeriesMetadataInterface>;

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
        { $push: { searchMatches: title } },
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
  } else {
    const sortBy = {} as SortByFilter;
    const titleQuery: GetSeriesFilter = { searchMatches: { $in: [title] } };
    failedLookupQuery = { title: title, type: 'series' };
    if (year) {
      failedLookupQuery.startYear = year;
      titleQuery.startYear = year;
    } else {
      sortBy.startYear = 1;
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
    const seriesTMDBID = await getSeriesTMDBIDFromTMDBAPI(null, title, Number(year));

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
      return getSeriesMetadata(null, title + ' ' + year, null, title);
    }
    omdbData = mapper.parseOMDbAPISeriesResponse(omdbResponse);
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

  if (title) {
    combinedResponse.searchMatches = [title];
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
 * Attempts a query to the TMDB API and standardizes the response
 * before returning.
 *
 * @param [movieOrSeriesTitle] the title of the movie or series
 * @param [movieOrEpisodeIMDbID] the IMDb ID of the movie or episode
 * @param [year] the year of first release
 * @param [seasonNumber] the season number if this is an episode
 * @param [episodeNumber] the episode number if this is an episode
 */
export const getFromTMDBAPI = async(movieOrSeriesTitle?: string, movieOrEpisodeIMDbID?: string, year?: number, seasonNumber?: number, episodeNumbers?: number[]): Promise<MediaMetadataInterface | null> => {
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
        const tvEpisodeResult = findResult.tv_episode_results[0] as any;
        seriesTMDBID = tvEpisodeResult?.show_id;
      }
    } else {
      const seriesMetadata = await getSeriesMetadata(null, movieOrSeriesTitle, yearString);
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
