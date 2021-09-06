import { Movie, SearchRequest, TVShow } from '@universalmediaserver/node-imdb-api';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import * as natural from 'natural';

import osAPI from '../services/opensubtitles';

import { IMDbIDNotFoundError, ValidationError } from '../helpers/customErrors';
import FailedLookups from '../models/FailedLookups';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import omdbAPI from './omdb-api';
import { mapper } from '../utils/data-mapper';
import { EpisodeRequest, SearchMovieRequest, SearchTvRequest } from 'moviedb-promise/dist/request-types';
import { moviedb } from '../controllers/media';

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
        console.error(e);
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

/**
 * Attempts a query to the TMDB API and standardizes the response
 * before returning.
 *
 * @param [movieOrSeriesTitle] the title of the movie or series
 * @param [imdbID] the IMDb ID of the movie or series
 * @param [year] the year of first release
 * @param [seasonNumber] the season number if this is an episode
 * @param [episodeNumber] the episode number if this is an episode
 */
export const getFromTMDBAPI = async(movieOrSeriesTitle?: string, imdbID?: string, year?: number, seasonNumber?: number, episodeNumber?: number): Promise<MediaMetadataInterface | null> => {
  if (!movieOrSeriesTitle && !imdbID) {
    throw new Error('Either movieOrSeriesTitle or IMDb ID must be specified');
  }
  // If the client specified an episode number, this is an episode
  const isExpectingTVEpisode = Boolean(episodeNumber);

  let metadata;
  if (isExpectingTVEpisode) {
    // TODO: Handle imdbID for episodes
    let idToSearch: string | number = imdbID;
    if (!idToSearch) {
      const tmdbQuery: SearchTvRequest = { query: movieOrSeriesTitle };
      if (year) {
        // eslint-disable-next-line @typescript-eslint/camelcase
        tmdbQuery.first_air_date_year = year;
      }
      const searchResults = await moviedb.searchTv(tmdbQuery);
      if (searchResults?.results && searchResults.results[0] && searchResults.results[0].id) {
        idToSearch = searchResults.results[0].id;
      }
    }

    const episodeRequest: EpisodeRequest = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      append_to_response: 'images,external_ids,credits',
      // eslint-disable-next-line @typescript-eslint/camelcase
      episode_number: episodeNumber,
      id: idToSearch,
      // eslint-disable-next-line @typescript-eslint/camelcase
      season_number: seasonNumber,
    };

    const tmdbData = await moviedb.episodeInfo(episodeRequest);
    metadata = mapper.parseTMDBAPIEpisodeResponse(tmdbData);
  } else {
    let idToSearch: string | number = imdbID;
    if (!idToSearch) {
      const tmdbQuery: SearchMovieRequest = { query: movieOrSeriesTitle };
      if (year) {
        tmdbQuery.year = year;
      }
      const searchResults = await moviedb.searchMovie(tmdbQuery);
      if (searchResults?.results && searchResults.results[0] && searchResults.results[0].id) {
        idToSearch = searchResults.results[0].id;
      }
    }

    const tmdbData = await moviedb.movieInfo({
      // eslint-disable-next-line @typescript-eslint/camelcase
      append_to_response: 'images,external_ids,credits',
      id: idToSearch,
    });
    // console.log(13, tmdbData);
    metadata = mapper.parseTMDBAPIMovieResponse(tmdbData);
  }
  return metadata;
};

/**
 * Sets and returns series metadata by IMDb ID.
 *
 * @param imdbID the IMDb ID of the series.
 */
export const setSeriesMetadataByIMDbID = async(imdbID: string): Promise<SeriesMetadataInterface | null> => {
  if (!imdbID) {
    throw new Error('IMDb ID not supplied');
  }

  // Shouldn't really happen since we got this IMDb ID from their API
  if (await FailedLookups.findOne({ imdbID }, '_id', { lean: true }).exec()) {
    await FailedLookups.updateOne({ imdbID }, { $inc: { count: 1 } }).exec();
    return null;
  }

  const existingSeries: SeriesMetadataInterface = await SeriesMetadata.findOne({ imdbID }, null, { lean: true }).exec();
  if (existingSeries) {
    return existingSeries;
  }

  const imdbData = await getFromOMDbAPIV2(imdbID);
  if (!imdbData) {
    await FailedLookups.updateOne({ imdbID }, { $inc: { count: 1 } }, { upsert: true, setDefaultsOnInsert: true }).exec();
    return null;
  }

  return SeriesMetadata.create(imdbData);
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
