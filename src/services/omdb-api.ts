import * as imdb from '@universalmediaserver/imdb-api';
import * as _ from 'lodash';

import { ExternalAPIError } from '../helpers/customErrors';

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
  try {
    return await originalModule.get(params);
  } catch (err) {
    handleError(err);
  }
};

omdbAPI.search = async(params): Promise<imdb.SearchResults> => {
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
      err.message.indexOf('Series not found!') !== 0 &&
      err.message.indexOf('Series or season not found!') !== 0
    )
  ) {
    throw err;
  }
}

export default omdbAPI;
