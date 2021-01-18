import * as OpenSubtitles from 'opensubtitles-api';
import * as _ from 'lodash';
import { ExternalAPIError } from '../helpers/customErrors';

const originalModule = new OpenSubtitles(process.env.OS_API_USERAGENT || 'TemporaryUserAgent');
const osAPI = _.cloneDeep(originalModule);

osAPI.identify = async function(osQuery): Promise<OpensubtitlesIdentifyResponse> {
  try {
    return await originalModule.identify(osQuery);
  } catch (err) {
    if (err.message === 'API seems offline') {
      throw new ExternalAPIError('Opensubtitles API is offline');
    }
    throw err;
  }
};

export default osAPI;
