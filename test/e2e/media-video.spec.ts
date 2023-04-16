import axios from 'axios';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import FailedLookupsModel from '../../src/models/FailedLookups';
import MediaMetadata, { MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';
import * as apihelper from '../../src/services/external-api-helper';

interface UmsApiMediaAxiosResponse  {
  status: number;
  data: MediaMetadataInterfaceDocument;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server: stoppable;
let mongod: MongoMemoryServer;

const MOVIE_INTERSTELLAR = {
  'imdbID': 'tt0816692',
  'title': 'Interstellar',
  'osdbHash': '0f0f4c9f3416e24f',
  'filebytesize': '2431697820',
  'plot': 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.'
};

const MOVIE_BLADE_RUNNER = {
  imdbID: 'tt1856101',
  tmdbID:335984,
  collectionTmdbID:422837,
};

const EPISODE_LOST = {
  'imdbID': 'tt0994359',
  'title': 'Confirmed Dead',
  'season': '4',
  'episode': '2',
  'seriesTitle': 'Lost',
  'seriesIMDbID': 'tt0411008',
};

const EPISODE_PRISONBREAK = {
  'osdbHash': '35acba68a9dcfc8f',
  'filebytesize': '271224190',
  'title': 'Behind the Eyes',
  'season': '5',
  'episode': '9',
  'imdbID': 'tt5538198',
  'year': 2017,
  'seriesIMDbID': 'tt0455275',
};

const EPISODE_AVATAR = {
  'episodeTitle': 'The Boiling Rock (1) & The Boiling Rock (2)',
  'osdbHash': 'de334f38f153fb6f',
  'filebytesize': '4695739425',
  'season': '3',
  'episode': '14-15',
  'imdbID': 'tt1176477',
  'year': 2005,
  'seriesIMDbID': 'tt0417299',
  'seriesTitle': 'Avatar: The Last Airbender',
};

describe('get by all', () => {
  beforeAll((done) => {
    require('../omdb-mocks');
    require('../opensubtitles-mocks');
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
    await mongoose.connection.dropDatabase();
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  describe('Movies', () => {
    test('should return a movie by imdbid, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${MOVIE_INTERSTELLAR.imdbID}`) as UmsApiMediaAxiosResponse;
      expect(response.headers['x-api-subversion']).toBeTruthy();
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(response.data.poster).toContain('https://');
      expect(response.data.searchMatches).toBeUndefined();
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${MOVIE_INTERSTELLAR.imdbID}`);
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(0);
    });

    test('should return a movie by title, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const tmdbSpy = jest.spyOn(apihelper, 'getFromTMDBAPI');
      let response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}`) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(1);

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}`);
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      expect(tmdbSpy).toHaveBeenCalledTimes(1);

      /*
       * Should also return the result for a similar title search with the same IMDb ID
       * when the returned result from the external API matches an existing IMDb ID.
       */
      response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title.toLowerCase()}`);
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      expect(tmdbSpy).toHaveBeenCalledTimes(2);
    });

    test('should return a movie by title AND imdbId from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video/v2?title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`);
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(0);
    });

    test('should return a movie by all possible params, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const openSubsSpy = jest.spyOn(apihelper, 'getFromOpenSubtitles');
      let response = await axios.get(`${appUrl}/api/media/video/v2?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}&title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      expect(openSubsSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();
      openSubsSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video/v2?osdbHash=${MOVIE_INTERSTELLAR.osdbHash}&filebytesize=${MOVIE_INTERSTELLAR.filebytesize}&title=${MOVIE_INTERSTELLAR.title}&imdbID=${MOVIE_INTERSTELLAR.imdbID}`);
      expect(response.data.title).toEqual(MOVIE_INTERSTELLAR.title);
      expect(response.data.type).toEqual('movie');
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(openSubsSpy).toHaveBeenCalledTimes(0);
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

  });

  describe('Episodes', () => {
    test('should return an episode by imdbid, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${EPISODE_LOST.imdbID}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(EPISODE_LOST.title);
      expect(response.data.type).toEqual('episode');
      expect(response.data.poster).toContain('https://');
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${EPISODE_LOST.imdbID}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`);
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual(EPISODE_LOST.title);
      expect(response.data.type).toEqual('episode');
    });

    test('should return an episode by series title, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(EPISODE_LOST.title);
      expect(response.data.type).toEqual('episode');
      expect(response.data.imdbID).toEqual(EPISODE_LOST.imdbID);
      expect(response.data.seriesIMDbID).toEqual(EPISODE_LOST.seriesIMDbID);
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`);
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual(EPISODE_LOST.title);
      expect(response.data.type).toEqual('episode');
      expect(response.data.seriesIMDbID).toEqual(EPISODE_LOST.seriesIMDbID);
    });

    test('should return an episode by osdbHash, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let response = await axios.get(`${appUrl}/api/media/video/v2?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(EPISODE_PRISONBREAK.title);
      expect(response.data.type).toEqual('episode');
      expect(response.data.imdbID).toEqual(EPISODE_PRISONBREAK.imdbID);
      expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/video/v2?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`);
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual(EPISODE_PRISONBREAK.title);
      expect(response.data.type).toEqual('episode');
      expect(response.data.imdbID).toEqual(EPISODE_PRISONBREAK.imdbID);
      expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);
    });
    // tests that when a result is found by open subtitles, we first check if we already have a document for that id
    test('should return an episode by osdbHash, but return existing metadata if found by imdbid', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const MongoSpy = jest.spyOn(MediaMetadata, 'findOne');
      await mongoose.connection.db.collection('media_metadata').insertOne({ imdbID: EPISODE_PRISONBREAK.imdbID, title: EPISODE_PRISONBREAK.title });
      const response = await axios.get(`${appUrl}/api/media/video/v2?osdbHash=${EPISODE_PRISONBREAK.osdbHash}&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(EPISODE_PRISONBREAK.title);
      expect(MongoSpy).toHaveBeenCalledTimes(2);
      expect(omdbSpy).toHaveBeenCalledTimes(0);
    });
    // this also tests opensubtitles validation
    test('should return an episode by when passed all possible params, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const openSubsSpy = jest.spyOn(apihelper, 'getFromOpenSubtitles');
      const url = `${appUrl}/api/media/video/v2?`+
        `osdbHash=${EPISODE_PRISONBREAK.osdbHash}`+
        `&filebytesize=${EPISODE_PRISONBREAK.filebytesize}`+
        `&title=${EPISODE_PRISONBREAK.title}`+
        `&season=${EPISODE_PRISONBREAK.season}`+
        `&episode=${EPISODE_PRISONBREAK.episode}`+
        `&year=${EPISODE_PRISONBREAK.year}`;
      let response = await axios.get(url) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(EPISODE_PRISONBREAK.title);
      expect(response.data.type).toEqual('episode');

      // This value comes from OMDb
      expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      expect(openSubsSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();
      openSubsSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(url);
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(openSubsSpy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual(EPISODE_PRISONBREAK.title);
      expect(response.data.type).toEqual('episode');
      expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);
    });

    test('should return two episodes when passed all possible params, from source APIs then store', async() => {
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      const openSubsSpy = jest.spyOn(apihelper, 'getFromOpenSubtitles');
      const url = `${appUrl}/api/media/video/v2?`+
        `osdbHash=${EPISODE_AVATAR.osdbHash}`+
        `&filebytesize=${EPISODE_AVATAR.filebytesize}`+
        `&title=${EPISODE_AVATAR.seriesTitle}`+
        `&season=${EPISODE_AVATAR.season}`+
        `&episode=${EPISODE_AVATAR.episode}`+
        `&year=${EPISODE_AVATAR.year}`;
      let response = await axios.get(url) as UmsApiMediaAxiosResponse;
      expect(response.data.title).toEqual(EPISODE_AVATAR.episodeTitle);
      expect(response.data.type).toEqual('episode');
      expect(response.data.episode).toEqual(EPISODE_AVATAR.episode);

      // This value comes from OMDb
      expect(response.data.seriesIMDbID).toEqual(EPISODE_AVATAR.seriesIMDbID);
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      expect(openSubsSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();
      openSubsSpy.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(url);
      expect(omdbSpy).toHaveBeenCalledTimes(0);
      expect(openSubsSpy).toHaveBeenCalledTimes(0);
      expect(response.data.title).toEqual(EPISODE_AVATAR.episodeTitle);
      expect(response.data.type).toEqual('episode');
      expect(response.data.episode).toEqual(EPISODE_AVATAR.episode);
      expect(response.data.seriesIMDbID).toEqual(EPISODE_AVATAR.seriesIMDbID);
    });
  });

  describe('Failures', () => {
    test('should find a failed lookup - movie', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let error: any;
      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=areallylongtitlethatsurelywontmatchanymoviename`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();

      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=areallylongtitlethatsurelywontmatchanymoviename`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(omdbSpy).toHaveBeenCalledTimes(0);
    });

    test('should find a failed lookup - episode', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      const omdbSpy = jest.spyOn(apihelper, 'getFromOMDbAPIV2');
      let error: any;
      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=999&episode=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);
      expect(omdbSpy).toHaveBeenCalledTimes(1);
      omdbSpy.mockReset();

      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=999&episode=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(omdbSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Validation', () => {
    test('should require title, osdbHash or imdbID param', async() => {
      let error: any;
      try {
        await axios.get(`${appUrl}/api/media/video/v2`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });

    test('should require filebytesize if attempting osbdHash search', async() => {
      let error: any;
      try {
        await axios.get(`${appUrl}/api/media/video/v2?osbdHash=fsd`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });
  });
});
