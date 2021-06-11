import { OpenSubtitles } from 'opensubtitles-api';
import * as _ from 'lodash';
import { ExternalAPIError } from '../helpers/customErrors';

let openSubtitlesApiUserAgent = 'TemporaryUserAgent';
if (process.env.OS_API_USERAGENT && typeof process.env.OS_API_USERAGENT === 'string') {
  openSubtitlesApiUserAgent = process.env.OS_API_USERAGENT;
}

const originalModule = new OpenSubtitles(openSubtitlesApiUserAgent);
const osAPI = _.cloneDeep(originalModule);

osAPI.identify = async function(osQuery): Promise<OpensubtitlesIdentifyResponse> {
  try {
    return await originalModule.identify(osQuery);
  } catch (err) {
    if (err instanceof Error && (err.message === 'API seems offline' || err.message.includes('Server under maintenance'))) {
      throw new ExternalAPIError('Opensubtitles API is offline');
    }
    throw err;
  }
};

export default osAPI;
