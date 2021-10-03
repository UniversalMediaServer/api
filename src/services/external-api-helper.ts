import { Movie, SearchRequest, TVShow } from '@universalmediaserver/node-imdb-api';
import escapeStringRegexp = require('escape-string-regexp');
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import * as natural from 'natural';

import imdbAPI from '../services/omdb-api';
import osAPI from '../services/opensubtitles';

import { IMDbIDNotFoundError, MediaNotFoundError, ValidationError } from '../helpers/customErrors';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import omdbAPI from './omdb-api';
import { mapper } from '../utils/data-mapper';
import { EpisodeRequest, ExternalId, SearchMovieRequest, SearchTvRequest } from 'moviedb-promise/dist/request-types';
import { moviedb } from './tmdb-api';
import { getTMDBImageBaseURL } from '../controllers/info';

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
 * @deprecated see getFromOMDbAPIV2
 */
export const getFromOMDbAPI = async(imdbId?: string, searchRequest?: SearchRequest): Promise<MediaMetadataInterface> => {
  if (!imdbId && !searchRequest) {
    throw new Error('All parameters were falsy');
  }

  /**
   * We need the IMDb ID for the OMDb API get request below so here we get it.
   * Along the way, if the result is an episode, we also instruct our episode
   * processor to asynchronously add the other episodes for that series to the
   * queue.
   */
  if (!imdbId) {
    const parsedFilename = episodeParser(searchRequest.name);
    const isTVEpisode = Boolean(parsedFilename && parsedFilename.show && parsedFilename.season && parsedFilename.episode);
    if (isTVEpisode) {
      searchRequest.name = parsedFilename.show;
      searchRequest.reqtype = 'series';
      const tvSeriesInfo = await omdbAPI.get(searchRequest);

      if (tvSeriesInfo && tvSeriesInfo instanceof TVShow) {
        const allEpisodes = await tvSeriesInfo.episodes();
        const currentEpisode = _.find(allEpisodes, { season: parsedFilename.season, episode: parsedFilename.episode });
        if (!currentEpisode) {
          throw new IMDbIDNotFoundError();
        }

        imdbId = currentEpisode.imdbid;
      }
    }

    if (!imdbId) {
      searchRequest.reqtype = 'movie';
      let searchResults;
      try {
        searchResults = await omdbAPI.search(searchRequest);
      } catch (e) {
        console.error(e);
        return null;
      }
      // find the best search results utilising the Jaro-Winkler distance metric
      const searchResultStringDistance = searchResults.results.map(result => natural.JaroWinklerDistance(searchRequest.name, result.title));
      const bestSearchResultKey = _.indexOf(searchResultStringDistance, _.max(searchResultStringDistance));

      const searchResult = searchResults.results[bestSearchResultKey] as Movie;
      if (!searchResult) {
        throw new IMDbIDNotFoundError();
      }

      imdbId = searchResult.imdbid;
    }
  }

  const imdbData = await omdbAPI.get({ id: imdbId });
  if (!imdbData) {
    return null;
  }

  let metadata;
  if (imdbData.type === 'movie') {
    metadata = mapper.parseOMDbAPIMovieResponse(imdbData);
  } else if (imdbData.type === 'series') {
    metadata = mapper.parseOMDbAPISeriesResponse(imdbData);
  } else if (imdbData.type === 'episode') {
    metadata = mapper.parseOMDbAPIEpisodeResponse(imdbData);
  } else {
    throw new Error('Received a type we did not expect');
  }

  return metadata;
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
 * @param [episode] the episode number if this is an episode
 */
export const getFromOMDbAPIV2 = async(imdbId?: string, searchRequest?: SearchRequest, season?: number, episode?: number): Promise<MediaMetadataInterface | null> => {
  if (!imdbId && !searchRequest) {
    throw new Error('Either imdbId or searchRequest must be specified');
  }
  // If the client specified an episode number, this is an episode
  const isExpectingTVEpisode = Boolean(episode);

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
        const currentEpisode = _.find(allEpisodes, { season, episode });
        if (!currentEpisode) {
          return null;
        }

        imdbId = currentEpisode.imdbid;
      }
    } else {
      searchRequest.reqtype = 'movie';
      let searchResults;
      try {
        searchResults = await omdbAPI.search(searchRequest);
      } catch (e) {
        if (!e.message || !e.message.startsWith('Movie not found!')) {
          console.error(e);
        }
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

  const imdbData = await omdbAPI.get({ id: imdbId });

  if (!imdbData) {
    return null;
  }

  let metadata;
  if (isExpectingTVEpisode || imdbData.type === 'episode') {
    if (imdbData.type === 'episode') {
      metadata = mapper.parseOMDbAPIEpisodeResponse(imdbData);
    } else {
      throw new Error('Received type ' + imdbData.type + ' but expected episode for ' + imdbId + ' ' + searchRequest + ' ' + season + ' ' + episode);
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
    // eslint-disable-next-line @typescript-eslint/camelcase
    const findResult = await moviedb.find({ id: imdbID, external_source: ExternalId.ImdbId });
    // Using any here to make up for missing interface, should submit fix
    if (findResult?.tv_results && findResult?.tv_results[0]) {
      const tvEpisodeResults = findResult.tv_results[0] as any;
      return tvEpisodeResults?.id;
    }
  } else {
    const tmdbQuery: SearchTvRequest = { query: seriesTitle };
    if (year) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      tmdbQuery.first_air_date_year = year;
    }
    const searchResults = await moviedb.searchTv(tmdbQuery);
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
 * @returns series metadata
 */
export const getSeriesMetadata = async(imdbID?: string, title?: string, year?: string): Promise<SeriesMetadataInterface | null> => {
  if (!imdbID && !title) {
    throw new Error('Either IMDb ID or title required');
  }

  if (imdbID) {
    // We shouldn't have failures since we got this IMDb ID from their API
    if (await FailedLookups.findOne({ imdbID }, '_id', { lean: true }).exec()) {
      await FailedLookups.updateOne({ imdbID }, { $inc: { count: 1 } }).exec();
      return null;
    }

    const existingSeries: SeriesMetadataInterface = await SeriesMetadata.findOne({ imdbID }, null, { lean: true }).exec();
    if (existingSeries) {
      return existingSeries;
    }

    // Start TMDB lookups
    let tmdbData: Partial<SeriesMetadataInterface> = {};
    const seriesID = await getSeriesTMDBIDFromTMDBAPI(imdbID);

    if (seriesID) {
      const seriesRequest = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        append_to_response: 'images,external_ids,credits',
        id: seriesID,
      };

      try {
        const tmdbResponse = await moviedb.tvInfo(seriesRequest);
        tmdbData = mapper.parseTMDBAPISeriesResponse(tmdbResponse);
      } catch (e) {
        console.log(e);
      }
    }
    // End TMDB lookups

    const omdbData = await getFromOMDbAPIV2(imdbID);

    const combinedResponse = _.merge(tmdbData, omdbData);
    if (!combinedResponse || _.isEmpty(combinedResponse)) {
      await FailedLookups.updateOne({ imdbID }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
      throw new MediaNotFoundError();
    }

    return SeriesMetadata.create(combinedResponse);
  } else {
    const sortBy = {} as SortByFilter;
    const escapedTitle = new RegExp(`^${escapeStringRegexp(title)}$`);
    const exactSearchQuery = { title: { $regex: escapedTitle, $options: 'i' } } as CaseInsensitiveSearchQuery;
    const failedLookupQuery: FailedLookupsInterface = { title: title, type: 'series' };
    if (year) {
      failedLookupQuery.startYear = year;
      exactSearchQuery.startYear = year;
    } else {
      sortBy.startYear = 1;
    }

    // Return early for previously-failed lookups
    if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }).exec();
      throw new MediaNotFoundError();
    }

    // Return any previous match
    const seriesMetadata = await SeriesMetadata.findOne(exactSearchQuery, null, { lean: true }).sort(sortBy)
      .exec();
    if (seriesMetadata) {
      return seriesMetadata;
    }

    // Extract the series name from the incoming string (usually not necessary)
    const parsed = episodeParser(title);
    title = parsed && parsed.show ? parsed.show : title;

    // Start TMDB lookups
    let tmdbData = {};
    const seriesTMDBID = await getSeriesTMDBIDFromTMDBAPI(null, title, Number(year));

    if (seriesTMDBID) {
      const seriesRequest = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        append_to_response: 'images,external_ids,credits',
        id: seriesTMDBID,
      };

      try {
        const tmdbResponse = await moviedb.tvInfo(seriesRequest);
        tmdbData = mapper.parseTMDBAPISeriesResponse(tmdbResponse);
      } catch (e) {
        console.log(e);
      }
    }
    // End TMDB lookups

    // Start OMDb lookups
    const searchRequest: SearchRequest = {
      name: title,
      reqtype: 'series',
    };
    if (year) {
      searchRequest.year = Number(year);
    }
    const omdbResponse = await imdbAPI.get(searchRequest);
    if (!tmdbData && !omdbResponse && year) {
      /**
       * If the client specified a year, it may have been incorrect because of
       * the way filename parsing works; the filename Galactica.1980.S01E01 might
       * be about a series called "Galactica 1980", or a series called "Galactica"
       * from 1980.
       * So, we attempt the lookup again with the year appended to the title.
       */
      return getSeriesMetadata(null, title + ' ' + year);
    }
    const omdbData = mapper.parseOMDbAPISeriesResponse(omdbResponse);
    // End OMDb lookups

    const combinedResponse = _.merge(tmdbData, omdbData);
    if (!combinedResponse || _.isEmpty(combinedResponse)) {
      await FailedLookups.updateOne(failedLookupQuery, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
      throw new MediaNotFoundError();
    }

    return await SeriesMetadata.create(combinedResponse);
  }
};

/*
 * If the incoming metadata contains a poster image within the images
 * array, we populate the poster value with that, and return the whole object.
 *
 * Future clients will be able to use the raw information
 * themselves but this is for backwards-compatibility.
 * When the client can use the information directly from
 * images.posters or images.stills, we should make it pass a version to prevent
 * having to do this for those newer versions.
 *
 * This must be done on-the-fly like this because the
 * imageBaseURL can change. The future client will request
 * that separately.
 */
export const addPosterFromImages = async(metadata: any): Promise<SeriesMetadataInterface | MediaMetadataInterface> => {
  if (!metadata) {
    throw new Error('Metadata is required');
  }

  if (metadata.poster) {
    // There is already a poster
    return metadata;
  }

  let posterRelativePath: string;

  if (metadata.posterRelativePath) {
    posterRelativePath = metadata.posterRelativePath;
  } else {
    const potentialPosters = metadata?.images?.posters ? metadata?.images?.posters : [];
    const potentialStills = metadata?.images?.stills || [];
    const potentialImagesCombined = _.concat(potentialPosters, potentialStills);
    if (_.isEmpty(potentialImagesCombined)) {
      // There are no potential images
      return metadata;
    }

    const englishImages = _.filter(potentialImagesCombined, { 'iso_639_1': 'en' }) || [];
    const noLanguageImages = _.filter(potentialImagesCombined, { 'iso_639_1': null }) || [];
    const posterCandidates = _.merge(noLanguageImages, englishImages);
    if (!posterCandidates || _.isEmpty(posterCandidates)) {
      // There are no English or non-language images
      return metadata;
    }

    const firstPoster = _.first(posterCandidates);
    posterRelativePath = firstPoster.file_path;
  }

  if (posterRelativePath) {
    const imageBaseURL = await getTMDBImageBaseURL();
    metadata.poster = imageBaseURL + 'w500' + posterRelativePath;
  }

  return metadata;
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
export const getFromTMDBAPI = async(movieOrSeriesTitle?: string, movieOrEpisodeIMDbID?: string, year?: number, seasonNumber?: number, episodeNumber?: number): Promise<MediaMetadataInterface | null> => {
  if (!movieOrSeriesTitle && !movieOrEpisodeIMDbID) {
    throw new Error('Either movieOrSeriesTitle or movieOrEpisodeIMDbID must be specified');
  }
  // If the client specified an episode number, this is an episode
  const isExpectingTVEpisode = Boolean(episodeNumber);
  const yearString = year ? year.toString() : null;

  let metadata;
  if (isExpectingTVEpisode) {
    const episodeIMDbID = movieOrEpisodeIMDbID;
    let seriesTMDBID: string | number;
    if (episodeIMDbID) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      const findResult = await moviedb.find({ id: episodeIMDbID, external_source: ExternalId.ImdbId });
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

    const episodeRequest: EpisodeRequest = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      append_to_response: 'images,external_ids,credits',
      // eslint-disable-next-line @typescript-eslint/camelcase
      episode_number: episodeNumber,
      id: seriesTMDBID,
      // eslint-disable-next-line @typescript-eslint/camelcase
      season_number: seasonNumber,
    };

    const tmdbData = await moviedb.episodeInfo(episodeRequest);
    metadata = mapper.parseTMDBAPIEpisodeResponse(tmdbData);
  } else {
    const movieIMDbID = movieOrEpisodeIMDbID;

    let movieTMDBID: string | number;
    if (movieIMDbID) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      const findResult = await moviedb.find({ id: movieIMDbID, external_source: ExternalId.ImdbId });
      // Using any here to make up for missing interface, should submit fix
      if (findResult?.movie_results && findResult?.movie_results[0]) {
        const movieResult = findResult.movie_results[0] as any;
        movieTMDBID = movieResult?.id;
      }
    } else {
      const tmdbQuery: SearchMovieRequest = { query: movieOrSeriesTitle };
      if (year) {
        tmdbQuery.year = year;
      }
      const searchResults = await moviedb.searchMovie(tmdbQuery);
      if (searchResults?.results && searchResults.results[0] && searchResults.results[0].id) {
        movieTMDBID = searchResults.results[0].id;
      }
    }

    if (!movieTMDBID) {
      return null;
    }

    const tmdbData = await moviedb.movieInfo({
      // eslint-disable-next-line @typescript-eslint/camelcase
      append_to_response: 'images,external_ids,credits',
      id: movieTMDBID,
    });
    metadata = mapper.parseTMDBAPIMovieResponse(tmdbData);
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
