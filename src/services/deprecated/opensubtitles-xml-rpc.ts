import * as OpenSubtitles from 'opensubtitles-api';
import * as _ from 'lodash';
import { ExternalAPIError } from '../../helpers/customErrors';
import * as client from 'prom-client';

const identifierCounter = new client.Counter({ name: 'opensubtitles_api_lookup_identify', help: 'Counter of get requests to opensubtitles identify api' });

const originalModule = new OpenSubtitles(process.env.OS_API_USERAGENT || 'TemporaryUserAgent');
const osAPI = _.cloneDeep(originalModule);

export interface OpensubtitlesIdentifyResponse {
  added: boolean;
  metadata: {
    aka: string[];
    awards: string[];
    cast: {
      [key: string]: string;
    };
    country: string[];
    cover: string;
    directors: object;
    duration: string;
    genres: string[];
    goofs: string;
    imdbid: string;
    language: string[];
    rating: string;
    tagline: string;
    title: string;
    trivia: string;
    votes: string;
    year: string;
  };
  moviebytesize: number;
  moviehash: string;
  subcount: string;
  type: string;
}

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

osAPI.identify = async function(osQuery: OpenSubtitlesQuery): Promise<OpensubtitlesIdentifyResponse> {
  identifierCounter.inc();
  try {
    return await originalModule.identify(osQuery);
  } catch (err) {
    if (err.message === 'API seems offline' || err.message.includes('Server under maintenance')) {
      throw new ExternalAPIError('Opensubtitles API is offline');
    }
    throw err;
  }
};

export default osAPI;
