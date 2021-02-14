import FailedLookupsModel from '../../src/models/FailedLookups';
import * as apihelper from '../../src/services/external-api-helper';

import * as mongoose from 'mongoose';
import got from 'got';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = new MongoMemoryServer();

const appUrl = 'http://localhost:3000';
let server;

const MOVIE_INTERSTELLAR = {
  'imdbId': 'tt0816692',
  'title': 'Interstellar',
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
};
// returns null from Open Subtitles
const EPISODE_MANDALORIAN = {
  'osdbHash': '43f0cf3a060ce6d5z7',
  'filebytesize': '1315319814',
};

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
      let response: any = await got(`${appUrl}/api/media/video?imdbID=${MOVIE_INTERSTELLAR.imdbId}`, { responseType: 'json' });
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
      let response: any = await got(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}`, { responseType: 'json' });
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
  });

  describe('Episodes', () => {
    it('should return an episode by imdbid, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response: any = await got(`${appUrl}/api/media/video?imdbID=${EPISODE_LOST.imdbId}`, { responseType: 'json' });
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
      let response: any = await got(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`, { responseType: 'json' });
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
      let response: any = await got(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Behind the Eyes');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0455275');
      // once for episode, once for series
      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      console.log(1111)
      response = await got(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`, { responseType: 'json' });
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.body.title).toEqual('Behind the Eyes');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0455275');
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
    // todo work out how to test this, as open subs is flakey. might need mocked
    it.skip('opensubtitles queries which fail, should not try byImdb', async() => {
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

  describe('Valdiation', () => {
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
        await got(`${appUrl}/api/media/video?=fsd`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 422 (Unprocessable Entity)');
    });
  });
});
