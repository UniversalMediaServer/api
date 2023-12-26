import axios from 'axios';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import CollectionMetadata, { CollectionMetadataInterface } from '../../src/models/CollectionMetadata';
import FailedLookups from '../../src/models/FailedLookups';
import * as apihelper from '../../src/services/external-api-helper';
import { tmdb } from '../../src/services/tmdb-api';

interface UmsApiCollectionAxiosResponse  {
  status: number;
  data: CollectionMetadataInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server : stoppable;
let mongod: MongoMemoryServer;

const COLLECTION_BLADE_RUNNER = {
  mediaType: 'collection',
  name: 'Blade Runner Collection',
  overview: 'An American neo-noir science-fiction film series',
  tmdbID:422837,
  movieTmdbIds:[78, 335984],
};

describe('Collection Metadata endpoint', () => {
  beforeAll((done) => {
    require('../tmdb-mocks');
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
    await CollectionMetadata.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  describe('get collection metadata', () => {
    it('should return collection metadata by TMDb ID', async() => {
      let response = await axios.get(`${appUrl}/api/media/collection?tmdbID=${COLLECTION_BLADE_RUNNER.tmdbID}`) as UmsApiCollectionAxiosResponse;
      expect(response.data.tmdbID).toBe(COLLECTION_BLADE_RUNNER.tmdbID);
      expect(response.data.name).toBe(COLLECTION_BLADE_RUNNER.name);
      expect(response.data.overview).toContain(COLLECTION_BLADE_RUNNER.overview);
      expect(response.data.movieTmdbIds).toStrictEqual(COLLECTION_BLADE_RUNNER.movieTmdbIds);
    });
    it('should return stored collection metadata on subsequent calls', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getCollectionMetadata');
      const spyGetFromTmdb = jest.spyOn(tmdb, 'collectionInfo');
      let response = await axios.get(`${appUrl}/api/media/collection?tmdbID=${COLLECTION_BLADE_RUNNER.tmdbID}`) as UmsApiCollectionAxiosResponse;
	  expect(response.data.name).toBe(COLLECTION_BLADE_RUNNER.name);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(1);
      spyGetFromApi.mockClear();
      spyGetFromTmdb.mockClear();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/collection?tmdbID=${COLLECTION_BLADE_RUNNER.tmdbID}`) as UmsApiCollectionAxiosResponse;
      expect(response.data.name).toBe(COLLECTION_BLADE_RUNNER.name);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(0);
    });
  });

  describe('Indexes', () => {
    test('Indexes should succed and log to console', async() => {
      console.info = jest.fn();
	  await CollectionMetadata.ensureIndexes();
      expect(console.info).toHaveBeenCalledWith('CollectionMetadata indexing complete');
    });
    test('should show error messages to console on fail', async() => {
      console.error = jest.fn();
      CollectionMetadata.emit('index', 'jest errored');
      expect(console.error).toHaveBeenCalledWith('CollectionMetadata index error: %s', 'jest errored');
    });
  });

  describe('Failures', () => {
    test('should find a failed lookup collection then store', async() => {
      expect(await FailedLookups.countDocuments()).toEqual(0);
      const spyGetFromApi = jest.spyOn(apihelper, 'getCollectionMetadata');
      const spyGetFromTmdb = jest.spyOn(tmdb, 'collectionInfo');
      let error: any;
      try {
        await axios.get(`${appUrl}/api/media/collection?tmdbID=15`);
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
        await axios.get(`${appUrl}/api/media/collection?tmdbID=15`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(0);
    });
  });

  describe('Validation', () => {
    test('should require tmdbID param', async() => {
      let error: any;
      try {
        await axios.get(`${appUrl}/api/media/collection`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
      try {
        await axios.get(`${appUrl}/api/media/collection?imdbID=15`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });
  });

});
