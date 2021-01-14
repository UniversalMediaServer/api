import * as imdb from 'imdb-api';
import * as _ from 'lodash';
import { ExternalAPIError } from '../helpers/customErrors';

let baseURL = 'https://www.omdbapi.com';
if (process.env.NODE_ENV === 'production') {
  baseURL = 'https://private.omdbapi.com';
}
const originalModule = new imdb.Client({ apiKey: process.env.IMDB_API_KEY, baseURL });
const imdbAPI = _.cloneDeep(originalModule);

imdbAPI.get = async function(params): Promise<any> {
  try {
    return await originalModule.get(params);
  } catch (err) {
    if (err.statusCode === 503) {
      throw new ExternalAPIError('IMDB API is offline');
    }
    console.error(err);
  }
};

imdbAPI.search = async function(params): Promise<any> {
  try {
    return await originalModule.search(params);
  } catch (err) {
    if (err.statusCode === 503) {
      throw new ExternalAPIError('IMDB API is offline');
    }
    console.error(err);
    throw err;
  }
};

export default imdbAPI;
