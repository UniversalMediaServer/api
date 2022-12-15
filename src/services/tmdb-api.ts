import * as _ from 'lodash';
import { MovieDb } from 'moviedb-promise';
import { ConfigurationResponse, Episode, EpisodeRequest, FindRequest, FindResponse, IdAppendToResponseRequest, MovieResultsResponse, SearchMovieRequest, SearchTvRequest, ShowResponse, TvResultsResponse, TvSeasonRequest, TvSeasonResponse } from 'moviedb-promise/dist/request-types';
import { ExternalAPIError } from '../helpers/customErrors';
import * as client from 'prom-client';

const configCounter = new client.Counter({ name: 'tmdb_api_config', help: 'Counter of configuration requests to tmdb api' });
const episodeInfoCounter = new client.Counter({ name: 'tmdb_api_episodeInfo', help: 'Counter of episodeInfo requests to tmdb api' });
const findCounter = new client.Counter({ name: 'tmdb_api_find', help: 'Counter of find requests to tmdb api' });
const searchMovieCounter = new client.Counter({ name: 'tmdb_api_searchMovie', help: 'Counter of searchMovie requests to tmdb api' });
const searchTvCounter = new client.Counter({ name: 'tmdb_api_searchTv', help: 'Counter of searchTv requests to tmdb api' });
const seasonInfoCounter = new client.Counter({ name: 'tmdb_api_seasonInfo', help: 'Counter of seasonInfo requests to tmdb api' });
const tvInfoCounter = new client.Counter({ name: 'tmdb_api_tvInfo', help: 'Counter of tvInfo requests to tmdb api' });


if (process.env.NODE_ENV === 'production' && !process.env.TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY not set');
}

const apiKey = process.env.TMDB_API_KEY || 'foo';
const baseUrl = apiKey === 'foo' ? 'https://local.themoviedb.org/3/' : undefined;
const originalModule = new MovieDb(apiKey, baseUrl);
export const tmdb = _.cloneDeep(originalModule);

const handleError = (err: Error): void => {
  const responseStatus = _.get(err, 'response.status');
  let responseStatusString: string;
  if (responseStatus) {
    responseStatusString = String(responseStatus);
  }
  if (responseStatusString && /^5/.exec(responseStatusString)) {
    throw new ExternalAPIError('TMDB API is offline');
  }
};

tmdb.configuration = async(): Promise<ConfigurationResponse> => {
  configCounter.inc();
  try {
    return await originalModule.configuration();
  } catch (err) {
    handleError(err);
  }
};

tmdb.episodeInfo = async(params?: EpisodeRequest): Promise<Episode> => {
  episodeInfoCounter.inc();
  try {
    return await originalModule.episodeInfo(params);
  } catch (err) {
    handleError(err);
  }
};

tmdb.find = async(params?: FindRequest): Promise<FindResponse> => {
  findCounter.inc();
  try {
    return await originalModule.find(params);
  } catch (err) {
    handleError(err);
  }
};

tmdb.searchMovie = async(params?: SearchMovieRequest): Promise<MovieResultsResponse> => {
  searchMovieCounter.inc();
  try {
    return await originalModule.searchMovie(params);
  } catch (err) {
    handleError(err);
  }
};

tmdb.searchTv = async(params?: SearchTvRequest): Promise<TvResultsResponse> => {
  searchTvCounter.inc();
  try {
    return await originalModule.searchTv(params);
  } catch (err) {
    handleError(err);
  }
};

tmdb.seasonInfo = async(params?: TvSeasonRequest): Promise<TvSeasonResponse> => {
  seasonInfoCounter.inc();
  try {
    return await originalModule.seasonInfo(params);
  } catch (err) {
    handleError(err);
  }
};

tmdb.tvInfo = async(params: string | number | IdAppendToResponseRequest): Promise<ShowResponse> => {
  tvInfoCounter.inc();
  try {
    return await originalModule.tvInfo(params);
  } catch (err) {
    handleError(err);
  }
};
