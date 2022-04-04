import * as imdb from '@universalmediaserver/node-imdb-api';
import * as _ from 'lodash';
import { ExternalAPIError } from '../helpers/customErrors';
import * as client from 'prom-client';

const getCounter = new client.Counter({ name: 'omdb_api_lookup_get', help: 'Counter of get requests to imdb api' });
const searchCounter = new client.Counter({ name: 'omdb_api_lookup_search', help: 'Counter of search requests to imdb api' });

let baseURL = 'https://www.omdbapi.com';
if (process.env.NODE_ENV === 'production') {
  baseURL = 'https://private.omdbapi.com';
  if (!process.env.IMDB_API_KEY) {
    throw new Error('IMDB_API_KEY not set');
  }
}
const originalModule = new imdb.Client({ apiKey: process.env.IMDB_API_KEY || 'foo', baseURL });
const omdbAPI = _.cloneDeep(originalModule);

omdbAPI.get = async(params): Promise<imdb.Movie | imdb.Episode | imdb.TVShow> => {
  getCounter.inc();
  try {
    return await originalModule.get(params);
  } catch (err) {
    handleError(err);
  }
};

omdbAPI.search = async(params): Promise<imdb.SearchResults> => {
  searchCounter.inc();
  try {
    return await originalModule.search(params);
  } catch (err) {
    handleError(err);
  }
};

const handleError = (err: Error) => {
  if (_.get(err, 'response.status') === 503) {
    throw new ExternalAPIError('IMDb API is offline');
  }
  if (
    !err.message ||
    (
      err.message.indexOf('Movie not found!') !== 0 &&
      err.message.indexOf('Series not found!') !== 0
    )
  ) {
    throw err;
  }
}

export default omdbAPI;
