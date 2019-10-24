import * as OpenSubtitles from 'opensubtitles-api';
const osAPI = new OpenSubtitles(process.env.OS_API_USERAGENT || 'TemporaryUserAgent');

export default osAPI;
