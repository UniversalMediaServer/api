import { Movie, SearchRequest, TVShow } from 'imdb-api';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import * as natural from 'natural';

import osAPI from '../services/opensubtitles';

import { IMDbIDNotFoundError, MediaNotFoundError } from '../helpers/customErrors';
import FailedLookups from '../models/FailedLookups';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import imdbAPI from './imdb-api';
import { mapper } from '../utils/data-mapper';

export const FAILED_LOOKUP_SKIP_DAYS = 30;

export interface OpenSubtitlesQuery {
  moviehash: string;
  moviebytesize: number;
}

export interface OpenSubtitlesValidation {
  year: string;
  season: string;
  episode: string;
}

/**
 * Attempts a query to the IMDb API and standardizes the response
 * before returning.
 *
 * IMDb does not return goofs, osdbHash, tagline, trivia
 *
 * @param [imdbId] the IMDb ID
 * @param [searchRequest] a query to perform in order to get the imdbId
 */
export const getFromIMDbAPI = async(imdbId?: string, searchRequest?: SearchRequest): Promise<MediaMetadataInterface> => {
  if (!imdbId && !searchRequest) {
    throw new Error('All parameters were falsy');
  }

  /**
   * We need the IMDb ID for the imdbAPI get request below so here we get it.
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
      const tvSeriesInfo = await imdbAPI.get(searchRequest);

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
        searchResults = await imdbAPI.search(searchRequest);
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

  const imdbData = await imdbAPI.get({ id: imdbId });
  if (!imdbData) {
    return null;
  }

  let metadata;
  if (imdbData.type === 'movie') {
    metadata = mapper.parseIMDBAPIMovieResponse(imdbData);
  } else if (imdbData.type === 'series') {
    metadata = mapper.parseIMDBAPISeriesResponse(imdbData);
  } else if (imdbData.type === 'episode') {
    metadata = mapper.parseIMDBAPIEpisodeResponse(imdbData);
  } else {
    throw new Error('Received a type we did not expect');
  }

  return metadata;
};

/**
 * Attempts a query to the IMDb API and standardizes the response
 * before returning.
 *
 * IMDb does not return goofs, osdbHash, tagline, trivia
 *
 * @param [imdbId] the IMDb ID
 * @param [searchRequest] a query to perform in order to get the imdbId
 * @param [season] the season number if this is an episode
 * @param [episode] the episode number if this is an episode
 */
export const getFromIMDbAPIV2 = async(imdbId?: string, searchRequest?: SearchRequest, season?: number, episode?: number): Promise<MediaMetadataInterface | null> => {
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
      const tvSeriesInfo = await imdbAPI.get(searchRequest);

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
        searchResults = await imdbAPI.search(searchRequest);
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

  // Return early if we already have a result for that IMDb ID
  const imdbData = await imdbAPI.get({ id: imdbId });

  if (!imdbData) {
    return null;
  }

  let metadata;
  if (isExpectingTVEpisode || imdbData.type === 'episode') {
    if (imdbData.type === 'episode') {
      metadata = mapper.parseIMDBAPIEpisodeResponse(imdbData);
    } else {
      throw new Error('Received type ' + imdbData.type + ' but expected episode for ' + imdbId + ' ' + searchRequest + ' ' + season + ' ' + episode);
    }
  } else if (imdbData.type === 'movie') {
    metadata = mapper.parseIMDBAPIMovieResponse(imdbData);
  } else if (imdbData.type === 'series') {
    metadata = mapper.parseIMDBAPISeriesResponse(imdbData);
  } else {
    throw new Error('Received a type we did not expect: ' + imdbData.type);
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

  const imdbData = await getFromIMDbAPIV2(imdbID);
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
      if (validationData.season === openSubtitlesResponse.metadata.season && validationData.episode === openSubtitlesResponse.metadata.episode) {
        passedValidation = true;
      }
    }
  }
  if (!passedValidation) {
    await FailedLookups.updateOne({ osdbHash: osQuery.moviehash }, { $inc: { count: 1 }, failedValidation: true }, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
  if (openSubtitlesResponse.type === 'episode') {
    return mapper.parseOpenSubtitlesEpisodeResponse(openSubtitlesResponse);
  }

  return mapper.parseOpenSubtitlesResponse(openSubtitlesResponse);
};
