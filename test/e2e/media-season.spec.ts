import axios from 'axios';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import FailedLookups from '../../src/models/FailedLookups';
import SeasonMetadata, { SeasonMetadataInterface } from '../../src/models/SeasonMetadata';
import * as apihelper from '../../src/services/external-api-helper';
import { tmdb } from '../../src/services/tmdb-api';

interface UmsApiSeasonAxiosResponse  {
  status: number;
  data: SeasonMetadataInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server : stoppable;
let mongod: MongoMemoryServer;

const SEASON_AVATAR = {
  airDate: '2007-09-21',
  externalIDs: {
    'freebase_mid': '/m/05dh3gn',
    'freebase_id': null,
    'tvdb_id': 16658,
    'tvrage_id': null,
    'wikidata_id': 'Q13517027',
  },
  name: 'Book Three: Fire',
  overview: 'Aang wakes up from his battle with Azula to discover',
  seasonNumber: 3,
  seriesTitle: 'Avatar: The Last Airbender',
  tmdbID: 786,
  tmdbTvID: 246,
  year: 2005,
};

describe('Season Metadata endpoint', () => {
  beforeAll((done) => {
    MongoMemoryServer.create()
      .then((value) => {
        mongod = value;
        const mongoUrl = mongod.getUri();
        process.env.MONGO_URL = mongoUrl;
        return mongoose.connect(mongoUrl);
      })
      .then(() => {
        mongoose.set('strictQuery', true);
        server = app.listen(PORT, () => {
          stoppable(server, 0);
          done();
        });
      });
  });

  beforeEach(async() => {
    await FailedLookups.deleteMany({});
    await SeasonMetadata.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  describe('get season metadata', () => {
    it('should return season metadata by series title', async() => {
      const response = await axios.get(`${appUrl}/api/media/season?title=${SEASON_AVATAR.seriesTitle}&season=${SEASON_AVATAR.seasonNumber}&year=${SEASON_AVATAR.year}`) as UmsApiSeasonAxiosResponse;
      expect(response.data.airDate).toBe(SEASON_AVATAR.airDate);
      expect(response.data).toHaveProperty('credits');
      expect(response.data).toHaveProperty('externalIDs');
      expect(response.data.externalIDs).toHaveProperty('freebase_id', SEASON_AVATAR.externalIDs.freebase_id);
      expect(response.data.externalIDs).toHaveProperty('freebase_mid', SEASON_AVATAR.externalIDs.freebase_mid);
      expect(response.data.externalIDs).toHaveProperty('tvdb_id', SEASON_AVATAR.externalIDs.tvdb_id);
      expect(response.data.externalIDs).toHaveProperty('tvrage_id', SEASON_AVATAR.externalIDs.tvrage_id);
      expect(response.data.externalIDs).toHaveProperty('wikidata_id', SEASON_AVATAR.externalIDs.wikidata_id);
      expect(response.data).toHaveProperty('images');
      expect(response.data.name).toBe(SEASON_AVATAR.name);
      expect(response.data.tmdbTvID).toBe(SEASON_AVATAR.tmdbTvID);
      expect(response.data.tmdbID).toBe(SEASON_AVATAR.tmdbID);
      expect(response.data.seasonNumber).toBe(SEASON_AVATAR.seasonNumber);
      expect(response.data.overview).toContain(SEASON_AVATAR.overview);
    });
    it('should return season metadata by TMDb ID', async() => {
      const response = await axios.get(`${appUrl}/api/media/season?tmdbID=${SEASON_AVATAR.tmdbTvID}&season=${SEASON_AVATAR.seasonNumber}`) as UmsApiSeasonAxiosResponse;
      expect(response.data.airDate).toBe(SEASON_AVATAR.airDate);
      expect(response.data).toHaveProperty('credits');
      expect(response.data).toHaveProperty('externalIDs');
      expect(response.data).toHaveProperty('images');
      expect(response.data.name).toBe(SEASON_AVATAR.name);
      expect(response.data.tmdbTvID).toBe(SEASON_AVATAR.tmdbTvID);
      expect(response.data.tmdbID).toBe(SEASON_AVATAR.tmdbID);
      expect(response.data.seasonNumber).toBe(SEASON_AVATAR.seasonNumber);
      expect(response.data.overview).toContain(SEASON_AVATAR.overview);
    });
    it('should return stored season metadata on subsequent calls', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getSeasonMetadata');
      const spyGetFromTmdb = jest.spyOn(tmdb, 'seasonInfo');
      let response = await axios.get(`${appUrl}/api/media/season?tmdbID=${SEASON_AVATAR.tmdbTvID}&season=${SEASON_AVATAR.seasonNumber}`) as UmsApiSeasonAxiosResponse;
      expect(response.data.tmdbID).toBe(SEASON_AVATAR.tmdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(1);
      spyGetFromApi.mockClear();
      spyGetFromTmdb.mockClear();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/season?tmdbID=${SEASON_AVATAR.tmdbTvID}&season=${SEASON_AVATAR.seasonNumber}`) as UmsApiSeasonAxiosResponse;
      expect(response.data.tmdbID).toBe(SEASON_AVATAR.tmdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(0);
    });
  });

  describe('Indexes', () => {
    test('Indexes should succeed and log to console', async() => {
      console.info = jest.fn();
      await SeasonMetadata.ensureIndexes();
      expect(console.info).toHaveBeenCalledWith('SeasonMetadata indexing complete');
    });
    test('should show error messages to console on fail', async() => {
      console.error = jest.fn();
      SeasonMetadata.emit('index', 'jest errored');
      expect(console.error).toHaveBeenCalledWith('SeasonMetadata index error: %s', 'jest errored');
    });
  });

  describe('Failures', () => {
    test('should find a failed lookup season from TMDb ID then store', async() => {
      expect(await FailedLookups.countDocuments()).toEqual(0);
      const spyGetFromApi = jest.spyOn(apihelper, 'getSeasonMetadata');
      const spyGetFromTmdb = jest.spyOn(tmdb, 'seasonInfo');
      let error;
      try {
        await axios.get(`${appUrl}/api/media/season?tmdbID=${SEASON_AVATAR.tmdbTvID}&season=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookups.countDocuments()).toEqual(1);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(1);
      spyGetFromApi.mockClear();
      spyGetFromTmdb.mockClear();

      try {
        await axios.get(`${appUrl}/api/media/season?tmdbID=${SEASON_AVATAR.tmdbTvID}&season=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockClear();
      spyGetFromTmdb.mockClear();

      try {
        await axios.get(`${appUrl}/api/media/season?tmdbID=0&season=${SEASON_AVATAR.seasonNumber}`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookups.countDocuments()).toEqual(2);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(1);
    });
    test('should find a failed lookup season from title then store', async() => {
      expect(await FailedLookups.countDocuments()).toEqual(0);
      const spyGetFromApi = jest.spyOn(apihelper, 'getSeasonMetadata');
      const spyGetFromTmdb = jest.spyOn(tmdb, 'seasonInfo');
      let error;
      try {
        await axios.get(`${appUrl}/api/media/season?title=Not A Series Type&season=${SEASON_AVATAR.seasonNumber}`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookups.countDocuments()).toEqual(1);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockClear();
      spyGetFromTmdb.mockClear();

      try {
        await axios.get(`${appUrl}/api/media/season?title==Not A Series Type&season=${SEASON_AVATAR.seasonNumber}`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(0);
    });
  });

  describe('Validation', () => {
    test('should require tmdbID or title param', async() => {
      let error;
      try {
        await axios.get(`${appUrl}/api/media/season`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
      try {
        await axios.get(`${appUrl}/api/media/season?imdbID=15`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });
    test('should require saison number param', async() => {
      let error;
      //season is missing
      try {
        await axios.get(`${appUrl}/api/media/season?tmdbID=${SEASON_AVATAR.tmdbTvID}`);
      } catch (e) {
        error = e;
      }
      //season is not a number
      expect(error.message).toEqual('Request failed with status code 422');
      try {
        await axios.get(`${appUrl}/api/media/season?tmdbID=${SEASON_AVATAR.tmdbTvID}&season=notanumber`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });
  });

});
