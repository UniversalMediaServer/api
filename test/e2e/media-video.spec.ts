import FailedLookupsModel from '../../src/models/FailedLookups';
import * as apihelper from '../../src/services/external-api-helper';

import * as mongoose from 'mongoose';
import axios from 'axios';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';
import MediaMetadata, { MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';

let mongod;

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
  'imdbId': 'tt5538198',
  'year': 2017,
  'seriesIMDbID': 'tt0455275',
  'title': 'Behind the Eyes',
};

interface UmsApiAxiosResponse  {
  status: number;
  data: MediaMetadataInterfaceDocument;
  headers?: object;
}

describe('get by all', () => {
  beforeAll(async() => {
    mongod = await MongoMemoryServer.create();
    const mongoUrl = mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl);
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
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video?imdbID=${MOVIE_INTERSTELLAR.imdbId}`) as UmsApiAxiosResponse;
      expect(response.headers['x-api-subversion']).toBeTruthy();
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(response.data.poster).toContain('https://');
      expect(response.data.searchMatches).toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video?imdbID=${MOVIE_INTERSTELLAR.imdbId}`);
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should return a movie by title, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const spy2 = jest.spyOn(apihelper, 'getFromTMDBAPI');
      let response = await axios.get(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}`);
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);

      /*
       * Should also return the result for a similar title search with the same IMDb ID
       * when the returned result from the external API matches an existing IMDb ID.
       */
      response = await axios.get(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title.toLowerCase()}`);
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(2);
    });

    it('should return a movie by title AND imdbId from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`);
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should return a movie by all possible params, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const openSubsSpy = jest.spyOn(apihelper, 'getFromOpenSubtitles');
      let response = await axios.get(`${appUrl}/api/media/video?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}&title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      expect(openSubsSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();
      openSubsSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}&title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbId}`);
      expect(response.data.title).toEqual('Interstellar');
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(openSubsSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Episodes', () => {
    it('should return an episode by imdbid, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video?imdbID=${EPISODE_LOST.imdbId}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Confirmed Dead');
      expect(response.data.type).toEqual('episode');
      expect(response.data.poster).toContain('https://');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video?imdbID=${EPISODE_LOST.imdbId}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`);
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual('Confirmed Dead');
      expect(response.data.type).toEqual('episode');
    });

    it('should return an episode by title, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Confirmed Dead');
      expect(response.data.type).toEqual('episode');
      expect(response.data.seriesIMDbID).toEqual('tt0411008');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`);
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual('Confirmed Dead');
      expect(response.data.type).toEqual('episode');
      expect(response.data.seriesIMDbID).toEqual('tt0411008');
    });

    it('should return an episode by osdbHash, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Behind the Eyes');
      expect(response.data.type).toEqual('episode');
      expect(response.data.seriesIMDbID).toEqual('tt0455275');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`);
      expect(spy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual('Behind the Eyes');
      expect(response.data.type).toEqual('episode');
      expect(response.data.seriesIMDbID).toEqual('tt0455275');
    });
    // tests that when a result is found by open subtitles, we first check if we already have a document for that id
    it('should return an episode by osdbHash, but return existing metadata if found by imdbid', async() => {
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const MongoSpy = jest.spyOn(MediaMetadata, 'findOne');
      await mongoose.connection.db.collection('media_metadata').insertOne({ imdbID: EPISODE_PRISONBREAK.imdbId, title: 'Behind the Eyes' });
      const response = await axios.get(`${appUrl}/api/media/video?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Behind the Eyes');
      expect(MongoSpy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledTimes(0);
    });
    // this also tests opensubtitles valiation
    it('should return an episode by when passed all possible params, from source APIs then store', async() => {
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const openSubsSpy = jest.spyOn(apihelper, 'getFromOpenSubtitles');
      const url = `${appUrl}/api/media/video?`+
        `osdbHash=${EPISODE_PRISONBREAK.osdbHash}`+
        `&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`+
        `&title=${EPISODE_PRISONBREAK.title}`+
        `&season=${EPISODE_PRISONBREAK.season}`+
        `&episode=${EPISODE_PRISONBREAK.episode}`+
        `&year=${EPISODE_PRISONBREAK.year}`;
      let response = await axios.get(url) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual(EPISODE_PRISONBREAK.title);
      expect(response.data.type).toEqual('episode');

      // This value comes from OMDb
      expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(openSubsSpy).toHaveBeenCalledTimes(1);
      spy.mockReset();
      openSubsSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(url);
      expect(spy).toHaveBeenCalledTimes(0);
      expect(openSubsSpy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual(EPISODE_PRISONBREAK.title);
      expect(response.data.type).toEqual('episode');
      expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);
    });
  });

  describe('Failures', () => {
    it('should find a failed lookup - movie', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video?title=areallylongtitlethatsurelywontmatchanymoviename`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      try {
        await axios.get(`${appUrl}/api/media/video?title=areallylongtitlethatsurelywontmatchanymoviename`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should find a failed lookup - episode', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      const spy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=999&episode=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockReset();

      try {
        await axios.get(`${appUrl}/api/media/video?title=${EPISODE_LOST.title}&season=999&episode=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Validation', () => {
    it('should require title, osdbHash or imdbID param', async() => {
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });

    it('should require filebytesize if attempting osbdHash search', async() => {
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video?osbdHash=fsd`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });
  });
});
