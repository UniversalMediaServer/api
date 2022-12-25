import MediaMetadataModel, { MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';

import * as mongoose from 'mongoose';
import axios from 'axios';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';
import app, { PORT } from '../../src/app';
let mongod;

interface UmsApiAxiosResponse  {
  status: number;
  data: MediaMetadataInterfaceDocument;
  headers?: object;
}

const aloneEpisodeMetaData = {
  episode: '1',
  imdbID: 'tt4847892',
  season: '1',
  title: 'And So It Begins',
  type: 'episode',
  year: '2015',
};
const aloneMovieMetaData = {
  genres: ['Drama', 'Thriller'],
  imdbID: 'tt7711170',
  searchMatches: ['Alone'],
  title: 'Alone',
  type: 'movie',
  year: '2020',
};
const interstellarMetaData = {
  actors: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
  directors: ['Christopher Nolan'],
  genres: ['Adventure', 'Drama', 'Sci-Fi'],
  imdbID: 'tt0816692',
  osdbHash: 'f4245d9379d31e33',
  title: 'Interstellar',
  type: 'movie',
  year: '2014',
};
const theSimpsonsMetaData = {
  osdbHash: '8e245d9679d31e12',
  title: 'The Simpsons Movie',
};
const prisonBreakEpisodeMetadata = {
  osdbHash: 'aad16027e51ff49f',
  seriesIMDbID: 'tt0455275',
  episode: '4',
  title: 'Cute Poison',
};

const appUrl = 'http://localhost:3000';
let server;

describe('Media Metadata endpoints', () => {
  beforeAll((done) => {
    require('../omdb-mocks');
    require('../opensubtitles-xml-mocks');
    require('../tmdb-mocks');
    MongoMemoryServer.create()
      .then((value) => {
        mongod = value;
        const mongoUrl = mongod.getUri();
        process.env.MONGO_URL = mongoUrl;
        return mongoose.connect(mongoUrl);
      })
      .then(() => {
        server = app.listen(PORT, () => {
          stoppable(server, 0);
          done();
        })
      });
  });

  beforeEach(async() => {
    await FailedLookupsModel.deleteMany({});
    await MediaMetadataModel.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  describe('get by osdb hash', () => {
    test('should return a valid response for existing media record with osdb hash', async() => {
      await MediaMetadataModel.create(interstellarMetaData);
      const res = await axios.get(`${appUrl}/api/media/osdbhash/${interstellarMetaData.osdbHash}/1234`) as UmsApiAxiosResponse;
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('_id');
      expect(res.data).toHaveProperty('genres', interstellarMetaData.genres);
      expect(res.data).toHaveProperty('osdbHash', interstellarMetaData.osdbHash);
      expect(res.data).toHaveProperty('title', interstellarMetaData.title);
    });

    test('should return a valid response for a new osdbhash, then store it', async() => {
      // using example file from https://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes
      const res = await axios.get(`${appUrl}/api/media/osdbhash/${theSimpsonsMetaData.osdbHash}/12909756`) as UmsApiAxiosResponse;
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('_id');
      expect(res.data).toHaveProperty('year', '2007');
      expect(res.data).toHaveProperty('osdbHash', theSimpsonsMetaData.osdbHash);
      expect(res.data).toHaveProperty('title', 'The Simpsons Movie');
      expect(res.data).toHaveProperty('imdbID', 'tt0462538');
      expect(res.data).toHaveProperty('type', 'movie');
      expect(res.data).toHaveProperty('goofs');
      expect(res.data).toHaveProperty('trivia');
      expect(res.data).toHaveProperty('tagline');
      // from IMDb API
      expect(res.data).toHaveProperty('ratings', [
        { Source: 'Internet Movie Database', Value: '7.3/10' },
        { Source: 'Rotten Tomatoes', Value: '88%' },
        { Source: 'Metacritic', Value: '80/100' },
      ]);
      expect(res.data).toHaveProperty('metascore', '80');
      expect(res.data).toHaveProperty('poster', 'https://m.media-amazon.com/images/M/MV5BMTgxMDczMTA5N15BMl5BanBnXkFtZTcwMzk1MzMzMw@@._V1_SX300.jpg');
      expect(res.data).toHaveProperty('rated', 'PG-13');
      expect(res.data).toHaveProperty('rating', 7.3);
      expect(res.data).toHaveProperty('runtime', '87 min');
      expect(res.data).toHaveProperty('votes', '298,859');
      expect(res.data).toHaveProperty('boxoffice', '$183,100,000');
      expect(res.data).toHaveProperty('genres', ['Animation', 'Adventure', 'Comedy']);
      expect(res.data).toHaveProperty('actors', ['Dan Castellaneta', 'Julie Kavner', 'Nancy Cartwright', 'Yeardley Smith', 'Hank Azaria', 'Harry Shearer', 'Pamela Hayden', 'Tress MacNeille', 'Albert Brooks', 'Karl Wiedergott', 'Marcia Wallace', 'Russi Taylor', 'Maggie Roswell', 'Phil Rosenthal', 'Billie Joe Armstrong']);
  
      // should save to db
      const doc = await MediaMetadataModel.findOne({ osdbHash: res.data.osdbHash });
  
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('year', '2007');
      expect(doc).toHaveProperty('osdbHash', theSimpsonsMetaData.osdbHash);
      expect(doc).toHaveProperty('title', 'The Simpsons Movie');
      expect(doc).toHaveProperty('imdbID', 'tt0462538');
      expect(doc).toHaveProperty('type', 'movie');
      expect(doc).toHaveProperty('plot');
      expect(doc).toHaveProperty('goofs');
      expect(doc).toHaveProperty('trivia');
      expect(doc).toHaveProperty('tagline');
    });

    describe('should create a failed lookup document', () => {
      test('when Open Subtitles cannot find metadata and increment count field', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/f4245d9379d31e30/1234`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        let doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.count).toBe(1);

        try {
          await axios.get(`${appUrl}/api/media/osdbhash/f4245d9379d31e30/1234`);
        } catch (e) {
          // ignore error
        }
        doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc.count).toBe(2);
      });

      test('when client validation by year fails', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/${theSimpsonsMetaData.osdbHash}/1234?year=9999`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        const doc = await FailedLookupsModel.findOne({ osdbHash: theSimpsonsMetaData.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });

      test('when client validation for season fails', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=999&episode=4`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        const doc = await FailedLookupsModel.findOne({ osdbHash: prisonBreakEpisodeMetadata.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });

      test('when client validation for episode fails', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=1&episode=999`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        const doc = await FailedLookupsModel.findOne({ osdbHash: prisonBreakEpisodeMetadata.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });

      test('when client validation for season AND episode fails', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=999&episode=999`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        const doc = await FailedLookupsModel.findOne({ osdbHash: prisonBreakEpisodeMetadata.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });
    });

    test('should return an episode response when validation is supplied and passes', async() => {
      let error;
      let response;
      try {
        response = await axios.get(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=1&episode=4`);
      } catch (e) {
        error = e;
      }
      expect(error).toBeUndefined();
      expect(response.data).toHaveProperty('_id');
      expect(response.data).toHaveProperty('plot');
      expect(response.data).toHaveProperty('osdbHash', prisonBreakEpisodeMetadata.osdbHash);
    });

    test('should return a movie response when validation is supplied and passes', async() => {
      let error;
      let response;
      try {
        response = await axios.get(`${appUrl}/api/media/osdbhash/${theSimpsonsMetaData.osdbHash}/1234?year=2007`);
      } catch (e) {
        error = e;
      }
      expect(error).toBeUndefined();
      expect(response.data).toHaveProperty('_id');
      expect(response.data).toHaveProperty('osdbHash', theSimpsonsMetaData.osdbHash);
    });

    describe('should NOT create a failed lookup document', () => {
      test('when Open Subtitles is offline', async() => {
        await FailedLookupsModel.deleteMany({});
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/h4245d9379d31e33/12223334`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 503');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'h4245d9379d31e33' });
        expect(doc).toEqual(null);
      });

      test('when we did not receive a filebytesize', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/f4245d9379d31e30/`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toBeFalsy();
      });

      test('when we did not receive a hash', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash//1234`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toBeFalsy();
      });

      test('when we did not receive a valid hash', async() => {
        let error;
        try {
          await axios.get(`${appUrl}/api/media/osdbhash/notTheRightAmountOfCharacters/1234`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Request failed with status code 404');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toBeFalsy();
      });
    });

    test('should not throw an exception when Open Subtitles passes bad data', async() => {
      let error;
      try {
        await axios.get(`${appUrl}/api/media/osdbhash/a04cfbeafc4af7eb/884419440`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      const doc = await FailedLookupsModel.findOne({ osdbHash: 'a04cfbeafc4af7eb' });
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('osdbHash');
    });
  });

  describe('get by title v1', () => {
    test('should search by series title and store it, and not return searchMatches', async() => {
      const response = await axios.get(`${appUrl}/api/media/title?title=Homeland S02E05`) as UmsApiAxiosResponse;
      expect(response.data).toHaveProperty('_id');
      expect(response.data).not.toHaveProperty('searchMatches');

      const episode = await MediaMetadataModel.findOne({ searchMatches: { $in: ['Homeland S02E05'] } });
      expect(episode).toHaveProperty('_id');
      expect(episode).toHaveProperty('episode', '5');
      expect(episode).toHaveProperty('imdbID', 'tt2325080');
      expect(episode).toHaveProperty('season', '2');
      expect(episode).toHaveProperty('title', 'Q&A');
      expect(episode).toHaveProperty('type', 'episode');
      expect(episode).toHaveProperty('year', '2012');
      expect(episode.searchMatches).toBeUndefined();
    });

    test('should search by movie title and year and store it', async() => {
      const response = await axios.get(`${appUrl}/api/media/title?title=The Grinch&year=2018`) as UmsApiAxiosResponse;
      expect(response.data).toHaveProperty('_id');

      const movie = await MediaMetadataModel.findOne({ searchMatches: { $in: ['The Grinch'] } });
      expect(movie).toHaveProperty('_id');
      expect(movie).toHaveProperty('imdbID', 'tt2709692');
      expect(movie).toHaveProperty('title', 'The Grinch');
      expect(movie).toHaveProperty('type', 'movie');
      expect(movie).toHaveProperty('year', '2018');
      expect(movie).toHaveProperty('plot');
      expect(movie.searchMatches).toBeUndefined();
    });

    test('should require title as query param', async() => {
      try {
        await axios.get(`${appUrl}/api/media/title`);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual('Request failed with status code 422');
      }
    });

    test('should return best match for movie titles which return many search results from OMDb', async() => {
      const response = await axios.get(`${appUrl}/api/media/title?title=The Matrix Reloaded&year=2003`) as UmsApiAxiosResponse;
      expect(response.data.title).toBe('The Matrix Reloaded');
      /*
        The external API returns 5 movies for this title search, so the above test asserts we select the correct one, which is decided by
        using Jaro-Winkler string distance estimations vs the title that the client passed to us. This test determines the above to be the correct result, provided
        the following titles: 
        - The Matrix Reloaded
        - Decoded: The Making of 'The Matrix Reloaded
        - The Matrix Reloaded: Pre-Load
        - The Matrix Reloaded: Get Me an Exit
      */
    });
  });

  describe('get by title v2', () => {
    test('should search by series title, season and episode numbers, and store it, and not return searchMatches', async() => {
      const response = await axios.get(`${appUrl}/api/media/v2/title?title=Homeland&season=2&episode=5`);
      expect(response.data).toHaveProperty('_id');
      expect(response.data).not.toHaveProperty('searchMatches');

      const episode = await MediaMetadataModel.findOne({ searchMatches: { $in: ['Homeland'] } });
      expect(episode).toHaveProperty('_id');
      expect(episode).toHaveProperty('episode', '5');
      expect(episode).toHaveProperty('imdbID', 'tt2325080');
      expect(episode).toHaveProperty('season', '2');
      expect(episode).toHaveProperty('title', 'Q&A');
      expect(episode).toHaveProperty('type', 'episode');
      expect(episode).toHaveProperty('year', '2012');
      expect(episode.searchMatches).toBeUndefined();
    });

    test('should search by movie title and year and store it', async() => {
      const response = await axios.get(`${appUrl}/api/media/v2/title?title=The Grinch&year=2018`);
      expect(response.data).toHaveProperty('_id');

      const movie = await MediaMetadataModel.findOne({ searchMatches: { $in: ['The Grinch'] } });
      expect(movie).toHaveProperty('_id');
      expect(movie).toHaveProperty('imdbID', 'tt2709692');
      expect(movie).toHaveProperty('title', 'The Grinch');
      expect(movie).toHaveProperty('type', 'movie');
      expect(movie).toHaveProperty('year', '2018');
      expect(movie).toHaveProperty('plot');
      expect(movie.searchMatches).toBeUndefined();
    });

    test(`
      should not return a movie result when looking for an episode
      should not return an episode when looking for a movie
    `, async() => {
      await MediaMetadataModel.create(aloneMovieMetaData);

      let response = await axios.get(`${appUrl}/api/media/v2/title?title=Alone&season=1&episode=1`);
      expect(response.data).toHaveProperty('_id');

      const episode = await MediaMetadataModel.findOne({ searchMatches: { $in: ['Alone'] }, season: '1', episode: '1' });
      expect(episode).toHaveProperty('episode', aloneEpisodeMetaData.episode);
      expect(episode).toHaveProperty('imdbID', aloneEpisodeMetaData.imdbID);
      expect(episode).toHaveProperty('season', aloneEpisodeMetaData.season);
      expect(episode).toHaveProperty('title', aloneEpisodeMetaData.title);
      expect(episode).toHaveProperty('type', aloneEpisodeMetaData.type);
      expect(episode).toHaveProperty('year', aloneEpisodeMetaData.year);

      response = await axios.get(`${appUrl}/api/media/v2/title?title=Alone&year=2020`);
      expect(response.data).toHaveProperty('genres', aloneMovieMetaData.genres);
      expect(response.data).toHaveProperty('imdbID', aloneMovieMetaData.imdbID);
      expect(response.data).toHaveProperty('title', aloneMovieMetaData.title);
      expect(response.data).toHaveProperty('type', aloneMovieMetaData.type);
      expect(response.data).toHaveProperty('year', aloneMovieMetaData.year);
    });

    test('should require title as query param', async() => {
      try {
        await axios.get(`${appUrl}/api/media/v2/title`);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual('Request failed with status code 422');
      }
    });

    test('should return best match for movie titles which return many search results from OMDb', async() => {
      const response = await axios.get(`${appUrl}/api/media/v2/title?title=The Matrix Reloaded&year=2003`) as UmsApiAxiosResponse;
      expect(response.data.title).toBe('The Matrix Reloaded');
      /*
        The external API returns 5 movies for this title search, so the above test asserts we select the correct one, which is decided by
        using Jaro-Winkler string distance estimations vs the title that the client passed to us. This test determines the above to be the correct result, provided
        the following titles: 
        - The Matrix Reloaded
        - Decoded: The Making of 'The Matrix Reloaded
        - The Matrix Reloaded: Pre-Load
        - The Matrix Reloaded: Get Me an Exit
      */
    });
  });

  describe('get by imdbid', () => {
    test('should return a movie by imdbid', async() => {
      const response = await axios.get(`${appUrl}/api/media/imdbid?imdbid=tt0462538`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('The Simpsons Movie');
      expect(response.data.type).toEqual('movie');
    });

    test('should return a series by imdbid', async() => {
      const response = await axios.get(`${appUrl}/api/media/imdbid?imdbid=tt1796960`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Homeland');
      expect(response.data.type).toEqual('series');
    });

    test('should return an episode by imdbid', async() => {
      const response = await axios.get(`${appUrl}/api/media/imdbid?imdbid=tt3388032`) as UmsApiAxiosResponse;
      expect(response.data.title).toEqual('Proof of Concept');
      expect(response.data.type).toEqual('episode');
    });

    test('should NOT create a failed lookup document when IMDB api is down', async() => {
      let error;
      try {
        await axios.get(`${appUrl}/api/media/imdbid?imdbid=mocked-outage-id`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 503');
      expect(await FailedLookupsModel.countDocuments({})).toEqual(0);
    });
  });
});
