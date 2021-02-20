import * as imdb from 'imdb-api';
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
const imdbAPI = _.cloneDeep(originalModule);

imdbAPI.get = async function(params): Promise<any> {
  try {
    return await originalModule.get(params);
  } catch (err) {
    if (_.get(err, 'response.status') === 503) {
      throw new ExternalAPIError('IMDb API is offline');
    }
  }
};

imdbAPI.search = async function(params): Promise<any> {
  try {
    return await originalModule.search(params);
  } catch (err) {
    if (_.get(err, 'response.status') === 503) {
      throw new ExternalAPIError('IMDb API is offline');
    }
    throw err;
  }
};

export default imdbAPI;
