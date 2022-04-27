import { Movie, SearchRequest, TVShow } from '@universalmediaserver/imdb-api';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import * as natural from 'natural';

import { getTMDBImageBaseURL } from '../../controllers/info';
import { IMDbIDNotFoundError } from '../../helpers/customErrors';
import { MediaMetadataInterface } from '../../models/MediaMetadata';
import omdbAPI from '../omdb-api';
import { mapper } from '../../utils/data-mapper';
import { SeriesMetadataInterface } from '../../models/SeriesMetadata';

/**
 * @deprecated see getFromOMDbAPIV2
 */
export const getFromOMDbAPI = async(imdbId?: string, searchRequest?: SearchRequest): Promise<MediaMetadataInterface> => {
  if (!imdbId && !_.get(searchRequest, 'name')) {
    throw new Error('Either imdbId or searchRequest.name must be specified');
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

  if (!imdbId) {
    return null;
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

/*
 * If the incoming metadata contains a poster image within the images
 * array, we populate the poster value with that, and return the whole object.
 *
 * This must be done on-the-fly like this because the imageBaseURL can change.
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
