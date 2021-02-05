import MediaMetadataModel from '../../src/models/MediaMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';
import * as apihelper from '../../src/services/external-api-helper';

import * as mongoose from 'mongoose';
import got from 'got';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = new MongoMemoryServer();

const appUrl = 'http://localhost:3000';
let server;

const MOVIE = {
  'imdbId': 'tt0816692',
  'title': 'Interstellar',
};

const EPISODE = {
  'imdbId': 'tt0994359',
  'title': 'Lost',
  'season': '4',
  'episode': '2',
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
    await FailedLookupsModel.deleteMany({});
    await MediaMetadataModel.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });
  describe('Movies', () => {
    it('should return a movie by imdbid, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response: any = await got(`${appUrl}/api/media/getall?imdbID=${MOVIE.imdbId}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/getall?imdbID=${MOVIE.imdbId}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should return a movie by title, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response: any = await got(`${appUrl}/api/media/getall?title=${MOVIE.title}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/getall?title=${MOVIE.title}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Interstellar');
      expect(response.body.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Episodes', () => {
    it('should return an episode by imdbid, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response: any = await got(`${appUrl}/api/media/getall?imdbID=${EPISODE.imdbId}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/getall?imdbID=${EPISODE.imdbId}`, { responseType: 'json' });
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
    });

    it('should return an episode by title, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let response: any = await got(`${appUrl}/api/media/getall?title=${EPISODE.title}&season=${EPISODE.season}&episode=${EPISODE.episode}`, { responseType: 'json' });
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0411008');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await got(`${appUrl}/api/media/getall?title=${EPISODE.title}&season=${EPISODE.season}&episode=${EPISODE.episode}`, { responseType: 'json' });
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.body.title).toEqual('Confirmed Dead');
      expect(response.body.type).toEqual('episode');
      expect(response.body.seriesIMDbID).toEqual('tt0411008');
    });

    it('should return an episode by osdbHash, from source APIs then store', () => {
      //
    });
  });

  describe('Failures', () => {
    it('should find a failed lookup - movie', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      const spy = jest.spyOn(apihelper, 'getFromIMDbAPIV2');
      let error;
      try {
        await got(`${appUrl}/api/media/getall?title=areallylongtitlethatsurelywontmatchanymoviename`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      try {
        await got(`${appUrl}/api/media/getall?title=areallylongtitlethatsurelywontmatchanymoviename`, { responseType: 'json' });
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
        await got(`${appUrl}/api/media/getall?title=${EPISODE.title}&season=999&episode=999`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      try {
        await got(`${appUrl}/api/media/getall?title=${EPISODE.title}&season=999&episode=999`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Valdiation', () => {
    const params = ['title'];
    test.each(params)('Validation', () => {
      // expect errors
    });
  });
});
