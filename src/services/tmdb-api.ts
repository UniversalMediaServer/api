import * as _ from 'lodash';
import { MovieDb } from 'moviedb-promise';
import { ConfigurationResponse, Episode, EpisodeRequest, FindRequest, FindResponse, IdAppendToResponseRequest, MovieResultsResponse, SearchMovieRequest, SearchTvRequest, ShowResponse, TvResultsResponse, TvSeasonRequest, TvSeasonResponse } from 'moviedb-promise/dist/request-types';
import { ExternalAPIError } from '../helpers/customErrors';

if (process.env.NODE_ENV === 'production' && !process.env.TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY not set');
}
const originalModule = new MovieDb(process.env.TMDB_API_KEY);
export const tmdb = _.cloneDeep(originalModule);

tmdb.configuration = async(): Promise<ConfigurationResponse> => {
  try {
    return await originalModule.configuration();
  } catch (err) {
    const responseStatus = _.get(err, 'response.status');
    if (responseStatus && responseStatus.match(/^5/)) {
      throw new ExternalAPIError('TMDB API is offline');
    }
  }
};

tmdb.episodeInfo = async(params?: EpisodeRequest): Promise<Episode> => {
  try {
    return await originalModule.episodeInfo(params);
  } catch (err) {
    const responseStatus = _.get(err, 'response.status');
    if (responseStatus && responseStatus.match(/^5/)) {
      throw new ExternalAPIError('TMDB API is offline');
    }
  }
};

tmdb.find = async(params?: FindRequest): Promise<FindResponse> => {
  try {
    return await originalModule.find(params);
  } catch (err) {
    const responseStatus = _.get(err, 'response.status');
    if (responseStatus && responseStatus.match(/^5/)) {
      throw new ExternalAPIError('TMDB API is offline');
    }
  }
};

tmdb.searchMovie = async(params?: SearchMovieRequest): Promise<MovieResultsResponse> => {
  try {
    return await originalModule.searchMovie(params);
  } catch (err) {
    const responseStatus = _.get(err, 'response.status');
    if (responseStatus && responseStatus.match(/^5/)) {
      throw new ExternalAPIError('TMDB API is offline');
    }
  }
};

tmdb.searchTv = async(params?: SearchTvRequest): Promise<TvResultsResponse> => {
  try {
    return await originalModule.searchTv(params);
  } catch (err) {
    const responseStatus = _.get(err, 'response.status');
    if (responseStatus && responseStatus.match(/^5/)) {
      throw new ExternalAPIError('TMDB API is offline');
    }
  }
};

tmdb.seasonInfo = async(params?: TvSeasonRequest): Promise<TvSeasonResponse> => {
  try {
    return await originalModule.seasonInfo(params);
  } catch (err) {
    const responseStatus = _.get(err, 'response.status');
    if (responseStatus && responseStatus.match(/^5/)) {
      throw new ExternalAPIError('TMDB API is offline');
    }
  }
};

tmdb.tvInfo = async(params: string | number | IdAppendToResponseRequest): Promise<ShowResponse> => {
  try {
    return await originalModule.tvInfo(params);
  } catch (err) {
    const responseStatus = _.get(err, 'response.status');
    if (responseStatus && responseStatus.match(/^5/)) {
      throw new ExternalAPIError('TMDB API is offline');
    }
  }
};
