import FailedLookupsModel from '../../src/models/FailedLookups';
import * as apihelper from '../../src/services/external-api-helper';

import * as mongoose from 'mongoose';
import got from 'got';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';
import MediaMetadata, { MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';

const mongod = new MongoMemoryServer();

const appUrl = 'http://localhost:3000';
let server;

const MOVIE_INTERSTELLAR = {
  'imdbId': 'tt0816692',
  'title': 'Interstellar',
  'osdbHash': '0f0f4c9f3416e24f',
  'filebytesize': '2431697820',
};

const EPISODE_LOST = {
  'imdbId': 'tt0994359',
  'title': 'Lost',
  'season': '4',
  'episode': '2',
};

const EPISODE_PRISONBREAK = {
  'osdbHash': '35acba68a9dcfc8f',
  'filebytesize': '271224190',
  'season': '5',
  'episode': '9',
  'imdbId': 'tt0455275',
};
// returns null from Open Subtitles
const EPISODE_MANDALORIAN = {
  'osdbHash': '43f0cf3a060ce6d5z7',
  'filebytesize': '1315319814',
};

const EPISODE_BAND_OF_BROTHERS = {
  'osdbHash': 'fbfbfc3341a24205',
  'filebytesize': '547090397',
  'imdbID': 'tt1247462',
  'season': '1',
  'episode': '6',
  'title': 'Band of Brothers',
  'year': '2001',
};

interface UmsApiGotResponse  {
  statusCode: number;
  body: MediaMetadataInterfaceDocument;
  headers?: object;
}

describe('get by all', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
    server = require('../../src/app').server;
    stoppable(server, 0);
  });

  beforeEach(async() => {
    await mongoose.connection.dropDatabase();
  });

  afterAll(() => {
    server.stop();
  });

  describe('Movies', () => {
    it('should return a movie by imdbid, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response = await got(`${appUrl}/api/media/video?imdbID=${MOVIE_INTERSTELLAR.imdbId}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.headers['x-api-subversion']).toBeTruthy();
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?imdbID=${MOVIE_INTERSTELLAR.imdbId}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should return a movie by title, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response = await got(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should return a movie by osdbHash, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response = await got(`${appUrl}/api/media/video?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should return a movie by title AND imdbId from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response = await got(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should return a movie by all possible params, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      const openSubsSpy = jest.spyOn(apihelper, 'getFromOpenSubtitles');
      let response = await got(`${appUrl}/api/media/video?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}&title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      expect(openSubsSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();
      openSubsSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}&title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(openSubsSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Episodes', () => {
    it('should return an episode by imdbid, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response = await got(`${appUrl}/api/media/video?imdbID=${EPISODE_LOST.imdbId}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?imdbID=${EPISODE_LOST.imdbId}`, { responseType: 'json' });
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
    });

    it('should return an episode by title, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response = await got(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0411008');
      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`, { responseType: 'json' });
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0411008');
    });

    it('should return an episode by osdbHash, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response = await got(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Behind the Eyes');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0455275');
      // once for episode, once for series
      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`, { responseType: 'json' });
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.body.title).toEqual('Behind the Eyes');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0455275');
    });
    // tests that when a result is found by open subtitles, we first check if we already have a document for that id
    it('should return an episode by osdbHash, but return existing metadata if found by imdbid', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      const MongoSpy = jest.spyOn(MediaMetadata, 'findOne');
      await mongoose.connection.db.collection('media_metadata').insert({ imdbdID: 'tt0455275', title: 'Behind the Eyes' });
      const response = await got(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Behind the Eyes');
      expect(MongoSpy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledTimes(0);
    });
    // this also tests opensubtitles valiation
    it('should return an episode by when passed all possible params, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      const openSubsSpy = jest.spyOn(apihelper, 'getFromOpenSubtitles');
      const url = `${appUrl}/api/media/video?`+
        `osdbHash=${EPISODE_BAND_OF_BROTHERS.osdbHash}`+
        `&filebytesize=${EPISODE_BAND_OF_BROTHERS.filebytesize}`+
        `&title=${EPISODE_BAND_OF_BROTHERS.title}`+
        `&season=${EPISODE_BAND_OF_BROTHERS.season}`+
        `&episode=${EPISODE_BAND_OF_BROTHERS.episode}`+
        `&year=${EPISODE_BAND_OF_BROTHERS.year}`;
      let response = await got(url, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Bastogne');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0185906');
      // once for episode, once for series
      expect(spy).toHaveBeenCalledTimes(2);
      expect(openSubsSpy).toHaveBeenCalledTimes(1);
      spy.mockReset();
      openSubsSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(url, { responseType: 'json' });
      expect(spy).toHaveBeenCalledTimes(0);
      expect(openSubsSpy).toHaveBeenCalledTimes(0);
      expect(response.body.title).toEqual('Bastogne');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0185906');
    });
  });

  describe('Failures', () => {
    it('should find a failed lookup - movie', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let error;
      try {
        await got(`${appUrl}/api/media/video?title=areallylongtitlethatsurelywontmatchanymoviename`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      try {
        await got(`${appUrl}/api/media/video?title=areallylongtitlethatsurelywontmatchanymoviename`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should find a failed lookup - episode', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let error;
      try {
        await got(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=999&episode=999`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      try {
        await got(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=999&episode=999`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('opensubtitles queries which fail, should not try byImdb if only searching by hash', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let error;
      try {
        await got(`${appUrl}/api/media/video?osdbHash=${EPISODE_MANDALORIAN.osdbHash}&filebytesize=${EPISODE_MANDALORIAN.filebytesize}`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Validation', () => {
    it('should require title, osdbHash or imdbID param', async() => {
      let error;
      try {
        await got(`${appUrl}/api/media/video`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 422 (Unprocessable Entity)');
    });

    it('should require filebytesize if attempting osbdHash search', async() => {
      let error;
      try {
        await got(`${appUrl}/api/media/video?osbdHash=fsd`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 422 (Unprocessable Entity)');
    });
  });
});
