import * as _ from 'lodash';
import { ExternalAPIError } from '../helpers/customErrors';
import { OpensubtitlesApi } from './opensubtitles';
import * as client from 'prom-client';

const identifierCounter = new client.Counter({ name: 'opensubtitles_api_lookup_identify', help: 'Counter of get requests to opensubtitles identify api' });

if (process.env.NODE_ENV === 'production' && !process.env.OS_API_KEY) {
  throw new Error('OS_API_KEY not set');
}

const apiKey = process.env.OS_API_KEY || 'foo';
const baseUrl = apiKey === 'foo' ? 'https://local.opensubtitles.com' : undefined;
const originalModule = new OpensubtitlesApi(apiKey, baseUrl);
export const opensubtitles = _.cloneDeep(originalModule);

export interface OpenSubtitlesValidation {
  moviehash: string;
  mediaType: 'movie'|'episode'|'all';
  year: number;
  season: number;
  episode: number;
}

export default opensubtitles;
