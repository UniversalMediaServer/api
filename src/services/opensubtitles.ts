import * as OpenSubtitles from 'opensubtitles-api';
import * as _ from 'lodash';
import { ExternalAPIError } from '../helpers/customErrors';
import { OpenSubtitlesQuery } from './external-api-helper';

const originalModule = new OpenSubtitles(process.env.OS_API_USERAGENT || 'TemporaryUserAgent');
const osAPI = _.cloneDeep(originalModule);

osAPI.identify = async function(osQuery: OpenSubtitlesQuery): Promise<OpensubtitlesIdentifyResponse> {
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
