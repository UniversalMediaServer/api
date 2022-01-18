import * as OpenSubtitles from 'opensubtitles-api';
import * as _ from 'lodash';
import { ExternalAPIError } from '../helpers/customErrors';
import { OpenSubtitlesQuery } from './external-api-helper';
import * as client from 'prom-client';

const identifierCounter = new client.Counter({ name: 'opensubtitles_api_lookup_identify', help: 'Counter of get requests to opensubtitles identify api' });

const originalModule = new OpenSubtitles(process.env.OS_API_USERAGENT || 'TemporaryUserAgent');
const osAPI = _.cloneDeep(originalModule);

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
