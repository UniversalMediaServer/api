import axios from 'axios';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import FailedLookups from '../../src/models/FailedLookups';
import LocalizeMetadata, { LocalizeMetadataInterface } from '../../src/models/LocalizeMetadata';
import * as apihelper from '../../src/services/external-api-helper';

interface UmsApiLocalizeAxiosResponse  {
  status: number;
  data: LocalizeMetadataInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server: stoppable;
let mongod: MongoMemoryServer;

const MOVIE_BLADE_RUNNER_FRENCH = {
  language: 'fr',
  imdbID: 'tt1856101',
  mediaType: 'movie',
  title: 'Blade Runner 2049',
  overview: 'les nombreuses tensions entre les humains',
  tagline: 'La clé de l’avenir est enfin découverte.',
  tmdbID:335984,
};

const COLLECTION_BLADE_RUNNER_FRENCH = {
  language: 'fr',
  mediaType: 'collection',
  title: 'Blade Runner - Saga',
  overview: 'Une série de films de science-fiction',
  tmdbID:422837,
};

const SERIES_AVATAR_FRENCH = {
  language: 'fr',
  imdbID: 'tt0417299',
  title: 'Avatar : Le dernier maître de l\'air',
  mediaType: 'tv',
  overview: 'Ang est un jeune Maître de l',
  tagline: 'L\'eau. La terre. Le feu. L\'air.',
  tmdbID: 246,
};

const SEASON_AVATAR_FRENCH = {
  language: 'fr',
  title: 'Livre 3 - Le feu',
  mediaType: 'tv_season',
  overview: 'grosses surprises attendent Aang',
  seasonNumber: 3,
  tmdbID: 246,
};

const EPISODE_AVATAR_FRENCH = {
  language: 'fr',
  imdbID: 'tt1176477',
  title: 'Le rocher bouillant (1)',
  mediaType: 'tv_episode',
  overview: 'Sokka questionne Zuko sur',
  seasonNumber: 3,
  tmdbID: 246,
  episodeNumber: 14,
};

describe('Localize Metadata endpoint', () => {
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
    await LocalizeMetadata.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  describe('get movie localized metadata', () => {
    it('should return movie metadata localized by IMDb ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      const spyIdentifyTmdb = jest.spyOn(apihelper, 'getTmdbIdFromIMDbID');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${MOVIE_BLADE_RUNNER_FRENCH.language}&mediaType=${MOVIE_BLADE_RUNNER_FRENCH.mediaType}&imdbID=${MOVIE_BLADE_RUNNER_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;

      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(1);
      expect(response.data.imdbID).toBe(MOVIE_BLADE_RUNNER_FRENCH.imdbID);
      expect(response.data.tmdbID).toBe(MOVIE_BLADE_RUNNER_FRENCH.tmdbID);
      expect(response.data.title).toBe(MOVIE_BLADE_RUNNER_FRENCH.title);
      expect(response.data.tagline).toBe(MOVIE_BLADE_RUNNER_FRENCH.tagline);
      expect(response.data.overview).toContain(MOVIE_BLADE_RUNNER_FRENCH.overview);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${MOVIE_BLADE_RUNNER_FRENCH.language}&mediaType=${MOVIE_BLADE_RUNNER_FRENCH.mediaType}&imdbID=${MOVIE_BLADE_RUNNER_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.title).toEqual(MOVIE_BLADE_RUNNER_FRENCH.title);
      expect(response.data.imdbID).toBe(MOVIE_BLADE_RUNNER_FRENCH.imdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // call with TMDB ID should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${MOVIE_BLADE_RUNNER_FRENCH.language}&mediaType=${MOVIE_BLADE_RUNNER_FRENCH.mediaType}&tmdbID=${MOVIE_BLADE_RUNNER_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.title).toEqual(MOVIE_BLADE_RUNNER_FRENCH.title);
      expect(response.data.imdbID).toBe(MOVIE_BLADE_RUNNER_FRENCH.imdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
    });

    it('should return movie metadata localized by TMDB ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      const spyIdentifyTmdb = jest.spyOn(apihelper, 'getTmdbIdFromIMDbID');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${MOVIE_BLADE_RUNNER_FRENCH.language}&mediaType=${MOVIE_BLADE_RUNNER_FRENCH.mediaType}&tmdbID=${MOVIE_BLADE_RUNNER_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;

      expect(response.data.imdbID).toBe(MOVIE_BLADE_RUNNER_FRENCH.imdbID);
      expect(response.data.tmdbID).toBe(MOVIE_BLADE_RUNNER_FRENCH.tmdbID);
      expect(response.data.title).toBe(MOVIE_BLADE_RUNNER_FRENCH.title);
      expect(response.data.tagline).toBe(MOVIE_BLADE_RUNNER_FRENCH.tagline);
      expect(response.data.overview).toContain(MOVIE_BLADE_RUNNER_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // call with IMDB ID should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${MOVIE_BLADE_RUNNER_FRENCH.language}&mediaType=${MOVIE_BLADE_RUNNER_FRENCH.mediaType}&imdbID=${MOVIE_BLADE_RUNNER_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.title).toEqual(MOVIE_BLADE_RUNNER_FRENCH.title);
      expect(response.data.imdbID).toBe(MOVIE_BLADE_RUNNER_FRENCH.imdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
    });

  });

  describe('get collection localized metadata', () => {
    it('should return collection metadata localized by TMDB ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${COLLECTION_BLADE_RUNNER_FRENCH.language}&mediaType=${COLLECTION_BLADE_RUNNER_FRENCH.mediaType}&tmdbID=${COLLECTION_BLADE_RUNNER_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.tmdbID).toBe(COLLECTION_BLADE_RUNNER_FRENCH.tmdbID);
      expect(response.data.title).toBe(COLLECTION_BLADE_RUNNER_FRENCH.title);
      expect(response.data.overview).toContain(COLLECTION_BLADE_RUNNER_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      spyGetFromApi.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${COLLECTION_BLADE_RUNNER_FRENCH.language}&mediaType=${COLLECTION_BLADE_RUNNER_FRENCH.mediaType}&tmdbID=${COLLECTION_BLADE_RUNNER_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.tmdbID).toBe(COLLECTION_BLADE_RUNNER_FRENCH.tmdbID);
      expect(response.data.title).toBe(COLLECTION_BLADE_RUNNER_FRENCH.title);
      expect(response.data.overview).toContain(COLLECTION_BLADE_RUNNER_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
    });
  });

  describe('get tv series localized metadata', () => {
    it('should return tv series metadata localized by IMDb ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      const spyIdentifyTmdb = jest.spyOn(apihelper, 'getTmdbIdFromIMDbID');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${SERIES_AVATAR_FRENCH.language}&mediaType=${SERIES_AVATAR_FRENCH.mediaType}&imdbID=${SERIES_AVATAR_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.imdbID).toBe(SERIES_AVATAR_FRENCH.imdbID);
      expect(response.data.tmdbID).toBe(SERIES_AVATAR_FRENCH.tmdbID);
      expect(response.data.title).toBe(SERIES_AVATAR_FRENCH.title);
      expect(response.data.tagline).toBe(SERIES_AVATAR_FRENCH.tagline);
      expect(response.data.overview).toContain(SERIES_AVATAR_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(1);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${SERIES_AVATAR_FRENCH.language}&mediaType=${SERIES_AVATAR_FRENCH.mediaType}&imdbID=${SERIES_AVATAR_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.tmdbID).toBe(SERIES_AVATAR_FRENCH.tmdbID);
      expect(response.data.title).toBe(SERIES_AVATAR_FRENCH.title);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // call with TMDB ID should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${SERIES_AVATAR_FRENCH.language}&mediaType=${SERIES_AVATAR_FRENCH.mediaType}&tmdbID=${SERIES_AVATAR_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.tmdbID).toBe(SERIES_AVATAR_FRENCH.tmdbID);
      expect(response.data.title).toBe(SERIES_AVATAR_FRENCH.title);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
    });

    it('should return tv series metadata localized by TMDB ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      const spyIdentifyTmdb = jest.spyOn(apihelper, 'getTmdbIdFromIMDbID');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${SERIES_AVATAR_FRENCH.language}&mediaType=${SERIES_AVATAR_FRENCH.mediaType}&tmdbID=${SERIES_AVATAR_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.imdbID).toBe(SERIES_AVATAR_FRENCH.imdbID);
      expect(response.data.tmdbID).toBe(SERIES_AVATAR_FRENCH.tmdbID);
      expect(response.data.title).toBe(SERIES_AVATAR_FRENCH.title);
      expect(response.data.tagline).toBe(SERIES_AVATAR_FRENCH.tagline);
      expect(response.data.overview).toContain(SERIES_AVATAR_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // call with IMDB ID should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${SERIES_AVATAR_FRENCH.language}&mediaType=${SERIES_AVATAR_FRENCH.mediaType}&imdbID=${SERIES_AVATAR_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.tmdbID).toBe(SERIES_AVATAR_FRENCH.tmdbID);
      expect(response.data.title).toBe(SERIES_AVATAR_FRENCH.title);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
    });
  });

  describe('get tv season localized metadata', () => {
    it('should return tv season metadata localized by TMDB ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      const spyIdentifyTmdb = jest.spyOn(apihelper, 'getTmdbIdFromIMDbID');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${SEASON_AVATAR_FRENCH.language}&mediaType=${SEASON_AVATAR_FRENCH.mediaType}&tmdbID=${SEASON_AVATAR_FRENCH.tmdbID}&season=${SEASON_AVATAR_FRENCH.seasonNumber}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.tmdbID).toBe(SEASON_AVATAR_FRENCH.tmdbID);
      expect(response.data.seasonNumber).toBe(SEASON_AVATAR_FRENCH.seasonNumber);
      expect(response.data.title).toBe(SEASON_AVATAR_FRENCH.title);
      expect(response.data.overview).toContain(SEASON_AVATAR_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${SEASON_AVATAR_FRENCH.language}&mediaType=${SEASON_AVATAR_FRENCH.mediaType}&tmdbID=${SEASON_AVATAR_FRENCH.tmdbID}&season=${SEASON_AVATAR_FRENCH.seasonNumber}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.title).toBe(SEASON_AVATAR_FRENCH.title);
      expect(response.data.tmdbID).toBe(SEASON_AVATAR_FRENCH.tmdbID);
      expect(response.data.seasonNumber).toBe(SEASON_AVATAR_FRENCH.seasonNumber);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();
    });
  });

  describe('get tv episode localized metadata', () => {
    it('should return tv episode metadata localized by IMDb ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      const spyIdentifyTmdb = jest.spyOn(apihelper, 'getTmdbIdFromIMDbID');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&imdbID=${EPISODE_AVATAR_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.imdbID).toBe(EPISODE_AVATAR_FRENCH.imdbID);
      expect(response.data.tmdbID).toBe(EPISODE_AVATAR_FRENCH.tmdbID);
      expect(response.data.seasonNumber).toBe(EPISODE_AVATAR_FRENCH.seasonNumber);
      expect(response.data.episodeNumber).toBe(EPISODE_AVATAR_FRENCH.episodeNumber);
      expect(response.data.title).toBe(EPISODE_AVATAR_FRENCH.title);
      expect(response.data.overview).toContain(EPISODE_AVATAR_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(1);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // subsequent calls should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&imdbID=${EPISODE_AVATAR_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.title).toBe(EPISODE_AVATAR_FRENCH.title);
      expect(response.data.tmdbID).toBe(EPISODE_AVATAR_FRENCH.tmdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // call with TMDB ID should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&tmdbID=${EPISODE_AVATAR_FRENCH.tmdbID}&season=${EPISODE_AVATAR_FRENCH.seasonNumber}&episode=${EPISODE_AVATAR_FRENCH.episodeNumber}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.title).toBe(EPISODE_AVATAR_FRENCH.title);
      expect(response.data.tmdbID).toBe(EPISODE_AVATAR_FRENCH.tmdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
    });

    it('should return tv episode metadata localized by TMDB ID', async() => {
      const spyGetFromApi = jest.spyOn(apihelper, 'getLocalizedMetadata');
      const spyIdentifyTmdb = jest.spyOn(apihelper, 'getTmdbIdFromIMDbID');
      let response = await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&tmdbID=${EPISODE_AVATAR_FRENCH.tmdbID}&season=${EPISODE_AVATAR_FRENCH.seasonNumber}&episode=${EPISODE_AVATAR_FRENCH.episodeNumber}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.imdbID).toBe(EPISODE_AVATAR_FRENCH.imdbID);
      expect(response.data.tmdbID).toBe(EPISODE_AVATAR_FRENCH.tmdbID);
      expect(response.data.seasonNumber).toBe(EPISODE_AVATAR_FRENCH.seasonNumber);
      expect(response.data.episodeNumber).toBe(EPISODE_AVATAR_FRENCH.episodeNumber);
      expect(response.data.title).toBe(EPISODE_AVATAR_FRENCH.title);
      expect(response.data.overview).toContain(EPISODE_AVATAR_FRENCH.overview);
      expect(spyGetFromApi).toHaveBeenCalledTimes(1);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
      spyGetFromApi.mockReset();
      spyIdentifyTmdb.mockReset();

      // call with IMDB ID should return MongoDB result rather than calling external apis
      response = await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&imdbID=${EPISODE_AVATAR_FRENCH.imdbID}`) as UmsApiLocalizeAxiosResponse;
      expect(response.data.title).toBe(EPISODE_AVATAR_FRENCH.title);
      expect(response.data.tmdbID).toBe(EPISODE_AVATAR_FRENCH.tmdbID);
      expect(spyGetFromApi).toHaveBeenCalledTimes(0);
      expect(spyIdentifyTmdb).toHaveBeenCalledTimes(0);
    });
  });

  describe('Indexes', () => {
    test('Indexes should succeed and log to console', async() => {
      console.info = jest.fn();
      await LocalizeMetadata.ensureIndexes();
      expect(console.info).toHaveBeenCalledWith('LocalizeMetadata indexing complete');
    });

    test('should show error messages to console on fail', async() => {
      console.error = jest.fn();
      LocalizeMetadata.emit('index', 'jest errored');
      expect(console.error).toHaveBeenCalledWith('LocalizeMetadata index error: %s', 'jest errored');
    });
  });

  describe('Validation', () => {
    test('should require language, media type and either IMDb ID or TMDB Id type param', async() => {
      let error;

      //no param
      try {
        await axios.get(`${appUrl}/api/media/localize`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');

      //no language
      try {
        await axios.get(`${appUrl}/api/media/localize?mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&imdbID=${EPISODE_AVATAR_FRENCH.imdbID}`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');

      //no mediaType
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&imdbID=${EPISODE_AVATAR_FRENCH.imdbID}`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');

      //no imdbID or tmdbID
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });

    test('should require well formatted language', async() => {
      let error;

      //bad language
      const badLanguages = ['french', 'f', 'fr-fr'];
      for (let i = 0; i < badLanguages.length; i++) {
        try {
          await axios.get(`${appUrl}/api/media/localize?language=${badLanguages[i]}&mediaType=${MOVIE_BLADE_RUNNER_FRENCH.mediaType}&tmdbID=${MOVIE_BLADE_RUNNER_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 422');
      }
    });

    test('should require a known media type', async() => {
      let error;

      //bad media type
      const badMediaTypes = ['test', 'movies'];
      for (let i = 0; i < badMediaTypes.length; i++) {
        try {
          await axios.get(`${appUrl}/api/media/localize?language=${SEASON_AVATAR_FRENCH.language}&mediaType=${badMediaTypes[i]}&tmdbID=${MOVIE_BLADE_RUNNER_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 422');
      }
    });

    test('should require season number param for season media with TMDB Id', async() => {
      let error;

      //no saison number
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${SEASON_AVATAR_FRENCH.language}&mediaType=${SEASON_AVATAR_FRENCH.mediaType}&tmdbID=${SEASON_AVATAR_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');

      //bad saison number
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${SEASON_AVATAR_FRENCH.language}&mediaType=${SEASON_AVATAR_FRENCH.mediaType}&tmdbID=${SEASON_AVATAR_FRENCH.tmdbID}&season=notanumber`) as UmsApiLocalizeAxiosResponse;
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });

    test('should require season and episode number params for episode media with TMDB Id', async() => {
      let error;

      //no season number
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&tmdbID=${EPISODE_AVATAR_FRENCH.tmdbID}&season=${EPISODE_AVATAR_FRENCH.seasonNumber}`) as UmsApiLocalizeAxiosResponse;
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');

      //no episode number
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&tmdbID=${EPISODE_AVATAR_FRENCH.tmdbID}&episode=${EPISODE_AVATAR_FRENCH.episodeNumber}`) as UmsApiLocalizeAxiosResponse;
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');

      //bad season number
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${EPISODE_AVATAR_FRENCH.language}&mediaType=${EPISODE_AVATAR_FRENCH.mediaType}&tmdbID=${EPISODE_AVATAR_FRENCH.tmdbID}&season=notanumber&episode=${EPISODE_AVATAR_FRENCH.episodeNumber}`) as UmsApiLocalizeAxiosResponse;
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });

    test('should require TMDB Id params for collection media', async() => {
      let error;

      //no tmdbID
      try {
        await axios.get(`${appUrl}/api/media/localize?language=${COLLECTION_BLADE_RUNNER_FRENCH.language}&mediaType=${COLLECTION_BLADE_RUNNER_FRENCH.mediaType}&imdbID=${EPISODE_AVATAR_FRENCH.tmdbID}`) as UmsApiLocalizeAxiosResponse;
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });

  });

});
