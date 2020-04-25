import * as OpenSubtitles from 'opensubtitles-api';
import { ExternalAPIError } from '../helpers/customErrors';

const orignalModule = new OpenSubtitles(process.env.OS_API_USERAGENT || 'TemporaryUserAgent');
const osAPI = orignalModule;

osAPI.identify = async function(osQuery): Promise<OpensubtitlesIdentifyResponse> {
  try {
    return await osAPI.identify(osQuery);
  } catch (err) {
    if (err.message === 'API seems offline') {
      throw new ExternalAPIError('Opensubtitles API is offline');
    }
  }
};

export default osAPI;
