import * as _ from 'lodash';
import { FeaturesRequestParams, FeaturesResponse, OpensubtitlesApi, SubtitlesRequestParams, SubtitlesResponse } from './opensubtitles';
import * as client from 'prom-client';
import { AxiosRequestConfig } from 'axios';

const subtitlesCounter = new client.Counter({ name: 'opensubtitles_api_lookup_subtitles', help: 'Counter of get requests to opensubtitles subtitles api' });
const featuresCounter = new client.Counter({ name: 'opensubtitles_api_lookup_features', help: 'Counter of get requests to opensubtitles features api' });

if (process.env.NODE_ENV === 'production' && !process.env.OS_API_KEY) {
  throw new Error('OS_API_KEY not set');
}

const apiKey = process.env.OS_API_KEY || 'foo';
const baseUrl = apiKey === 'foo' ? 'https://local.opensubtitles.com/api/v1/' : undefined;
const originalModule = new OpensubtitlesApi(apiKey, baseUrl);
export const opensubtitles = _.cloneDeep(originalModule);

export interface OpenSubtitlesValidation {
  moviehash: string;
  mediaType: 'movie'|'episode'|'all';
  year: number;
  season: number;
  episode: number;
}

opensubtitles.subtitles = async function(params?: SubtitlesRequestParams, axiosConfig?: AxiosRequestConfig): Promise<SubtitlesResponse> {
  subtitlesCounter.inc();
  try {
    return await originalModule.subtitles(params, axiosConfig);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

opensubtitles.features = async function(params?: FeaturesRequestParams, axiosConfig?: AxiosRequestConfig): Promise<FeaturesResponse> {
  featuresCounter.inc();
  try {
    return await originalModule.features(params, axiosConfig);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export default opensubtitles;
