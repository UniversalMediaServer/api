import axios from 'axios';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import FailedLookupsModel from '../../src/models/FailedLookups';
import { MediaMetadataInterface } from '../../src/models/MediaMetadata';
import * as apihelper from '../../src/services/external-api-helper';

interface UmsApiMediaAxiosResponse  {
  status: number;
  data: MediaMetadataInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server: stoppable;
let mongod: MongoMemoryServer;

const MOVIE_INTERSTELLAR = {
  'imdbID': 'tt0816692',
  'title': 'Interstellar',
  'plot': 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.'
};

const MOVIE_BLADE_RUNNER = {
  imdbID: 'tt1856101',
  tmdbID:335984,
  collectionTmdbID:422837,
};

describe('get by all', () => {
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
    await mongoose.connection.dropDatabase();
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  test('should return a movie by imdbid, from source APIs then store', async() => {
    let response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${MOVIE_INTERSTELLAR.imdbID}`) as UmsApiMediaAxiosResponse;
    expect(response.headers['x-api-subversion']).toBeTruthy();
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');
    expect(response.data.searchMatches).toBeUndefined();

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${MOVIE_INTERSTELLAR.imdbID}`);
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');
  });

  test('should return a movie by title, from source APIs then store', async() => {
    const tmdbSpy = jest.spyOn(apihelper, 'getFromTMDBAPI');
    let response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}`) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}`);
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');
    expect(tmdbSpy).toHaveBeenCalledTimes(1);

    /*
      * Should also return the result for a similar title search with the same IMDb ID
      * when the returned result from the external API matches an existing IMDb ID.
      */
    response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title.toLowerCase()}`);
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');
    expect(tmdbSpy).toHaveBeenCalledTimes(2);
  });

  test('should return a movie by title AND imdbId from source APIs then store', async() => {
    let response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`);
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');
  });

  test('should return a movie by all possible params, from source APIs then store', async() => {
    let response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`);
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.type).toEqual('movie');
  });

  test('should return a movie (en-US) by title AND language, from source APIs then store', async() => {
    const tmdbSpy = jest.spyOn(apihelper, 'getFromTMDBAPI');
    let response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&language=fr`) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.plot).toEqual(MOVIE_INTERSTELLAR.plot);
    expect(response.data.type).toEqual('movie');
    expect(tmdbSpy).toHaveBeenCalledTimes(1);
    tmdbSpy.mockReset();

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&language=fr`) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
    expect(response.data.plot).toEqual(MOVIE_INTERSTELLAR.plot);
    expect(tmdbSpy).toHaveBeenCalledTimes(0);
  });

  test('should return a movie with collection, from source APIs then store', async() => {
    const tmdbSpy = jest.spyOn(apihelper, 'getFromTMDBAPI');
    let response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${MOVIE_BLADE_RUNNER.imdbID}`) as UmsApiMediaAxiosResponse;
    expect(response.data.tmdbID).toEqual(MOVIE_BLADE_RUNNER.tmdbID);
    expect(response.data.collectionTmdbID).toEqual(MOVIE_BLADE_RUNNER.collectionTmdbID);
    expect(response.data.type).toEqual('movie');
    expect(tmdbSpy).toHaveBeenCalledTimes(1);
    tmdbSpy.mockReset();

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${MOVIE_BLADE_RUNNER.imdbID}`) as UmsApiMediaAxiosResponse;
    expect(response.data.tmdbID).toEqual(MOVIE_BLADE_RUNNER.tmdbID);
    expect(response.data.collectionTmdbID).toEqual(MOVIE_BLADE_RUNNER.collectionTmdbID);
    expect(tmdbSpy).toHaveBeenCalledTimes(0);
  });

  describe('Failures', () => {
    test('should find a failed lookup', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=areallylongtitlethatsurelywontmatchanymoviename`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);

      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=areallylongtitlethatsurelywontmatchanymoviename`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
    });
  });

  describe('Validation', () => {
    test('should require title or imdbID param', async() => {
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video/v2`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });
  });
});
