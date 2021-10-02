import MediaMetadataModel, {  MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';

import * as mongoose from 'mongoose';
import got from 'got';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';
let mongod;

interface UmsApiGotResponse  {
  statusCode: number;
  body: MediaMetadataInterfaceDocument;
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
  beforeAll(async() => {
    mongod = await MongoMemoryServer.create();
    const mongoUrl = mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
    require('../mocks');
    require('../opensubtitles-mocks');
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

  describe('get by osdb hash', () => {
    it('should return a valid response for existing media record with osdb hash', async() => {
      await MediaMetadataModel.create(interstellarMetaData);
      const res = await got(`${appUrl}/api/media/osdbhash/${interstellarMetaData.osdbHash}/1234`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(res.headers['x-api-subversion']).toBeTruthy();
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('genres', interstellarMetaData.genres);
      expect(res.body).toHaveProperty('osdbHash', interstellarMetaData.osdbHash);
      expect(res.body).toHaveProperty('title', interstellarMetaData.title);
    });

    it('should return a valid response for a new osdbhash, then store it', async() => {
      // using example file from https://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes
      const res = await got(`${appUrl}/api/media/osdbhash/${theSimpsonsMetaData.osdbHash}/12909756`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('year', '2007');
      expect(res.body).toHaveProperty('osdbHash', theSimpsonsMetaData.osdbHash);
      expect(res.body).toHaveProperty('title', 'The Simpsons Movie');
      expect(res.body).toHaveProperty('imdbID', 'tt0462538');
      expect(res.body).toHaveProperty('type', 'movie');
      expect(res.body).toHaveProperty('goofs');
      expect(res.body).toHaveProperty('trivia');
      expect(res.body).toHaveProperty('tagline');
      // from IMDb API
      expect(res.body).toHaveProperty('ratings', [
        { Source: 'Internet Movie Database', Value: '7.3/10' },
        { Source: 'Rotten Tomatoes', Value: '88%' },
        { Source: 'Metacritic', Value: '80/100' },
      ]);
      expect(res.body).toHaveProperty('metascore', '80');
      expect(res.body).toHaveProperty('poster', 'https://m.media-amazon.com/images/M/MV5BMTgxMDczMTA5N15BMl5BanBnXkFtZTcwMzk1MzMzMw@@._V1_SX300.jpg');
      expect(res.body).toHaveProperty('rated', 'PG-13');
      expect(res.body).toHaveProperty('rating', 7.3);
      expect(res.body).toHaveProperty('runtime', '87 min');
      expect(res.body).toHaveProperty('votes', '298,859');
      expect(res.body).toHaveProperty('boxoffice', '$183,100,000');
      expect(res.body).toHaveProperty('genres', ['Animation', 'Adventure', 'Comedy']);
      expect(res.body).toHaveProperty('actors', ['Dan Castellaneta', 'Julie Kavner', 'Nancy Cartwright', 'Yeardley Smith', 'Hank Azaria', 'Harry Shearer', 'Pamela Hayden', 'Tress MacNeille', 'Albert Brooks', 'Karl Wiedergott', 'Marcia Wallace', 'Russi Taylor', 'Maggie Roswell', 'Phil Rosenthal', 'Billie Joe Armstrong']);
  
      // should save to db
      const doc = await MediaMetadataModel.findOne({ osdbHash: res.body.osdbHash });
  
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
      it('when Open Subtitles cannot find metadata and increment count field', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/f4245d9379d31e30/1234`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        let doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.count).toBe(1);

        try {
          await got(`${appUrl}/api/media/osdbhash/f4245d9379d31e30/1234`);
        } catch (e) {
          // ignore error
        }
        doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc.count).toBe(2);
      });

      it('when client validation by year fails', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/${theSimpsonsMetaData.osdbHash}/1234?year=9999`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: theSimpsonsMetaData.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });

      it('when client validation for season fails', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=999&episode=4`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: prisonBreakEpisodeMetadata.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });

      it('when client validation for episode fails', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=1&episode=999`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: prisonBreakEpisodeMetadata.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });

      it('when client validation for season AND episode fails', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=999&episode=999`, { responseType: 'json' });
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: prisonBreakEpisodeMetadata.osdbHash });
        expect(doc).toHaveProperty('_id');
        expect(doc).toHaveProperty('osdbHash');
        expect(doc.failedValidation).toBe(true);
      });
    });

    it('should return an episode response when validation is supplied and passes', async() => {
      let error;
      let response;
      try {
        response = await got(`${appUrl}/api/media/osdbhash/${prisonBreakEpisodeMetadata.osdbHash}/1234?season=1&episode=4`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error).toBeUndefined();
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('plot');
      expect(response.body).toHaveProperty('osdbHash', prisonBreakEpisodeMetadata.osdbHash);
    });

    it('should return a movie response when validation is supplied and passes', async() => {
      let error;
      let response;
      try {
        response = await got(`${appUrl}/api/media/osdbhash/${theSimpsonsMetaData.osdbHash}/1234?year=2007`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error).toBeUndefined();
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('osdbHash', theSimpsonsMetaData.osdbHash);
    });

    describe('should NOT create a failed lookup document', () => {
      it('when Open Subtitles is offline', async() => {
        await FailedLookupsModel.deleteMany({});
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/h4245d9379d31e33/12223334`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 503 (Service Unavailable)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'h4245d9379d31e33' });
        expect(doc).toEqual(null);
      });

      it('when we did not receive a filebytesize', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/f4245d9379d31e30/`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toBeFalsy();
      });

      it('when we did not receive a hash', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash//1234`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toBeFalsy();
      });

      it('when we did not receive a valid hash', async() => {
        let error;
        try {
          await got(`${appUrl}/api/media/osdbhash/notTheRightAmountOfCharacters/1234`);
        } catch (e) {
          error = e;
        }
        expect(error.message).toEqual('Response code 404 (Not Found)');
        const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
        expect(doc).toBeFalsy();
      });
    });

    it('should not throw an exception when Open Subtitles passes bad data', async() => {
      let error;
      try {
        await got(`${appUrl}/api/media/osdbhash/a04cfbeafc4af7eb/884419440`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 404 (Not Found)');
      const doc = await FailedLookupsModel.findOne({ osdbHash: 'a04cfbeafc4af7eb' });
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('osdbHash');
    });
  });

  describe('get by title v1', () => {
    it('should search by series title and store it, and not return searchMatches', async() => {
      const response = await got(`${appUrl}/api/media/title?title=Homeland S02E05`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body).toHaveProperty('_id');
      expect(response.body).not.toHaveProperty('searchMatches');

      const episode = await MediaMetadataModel.findOne({ searchMatches: { $in: ['Homeland S02E05'] } });
      expect(episode).toHaveProperty('_id');
      expect(episode).toHaveProperty('episode', '5');
      expect(episode).toHaveProperty('imdbID', 'tt2325080');
      expect(episode).toHaveProperty('season', '2');
      expect(episode).toHaveProperty('seriesIMDbID', 'tt1796960');
      expect(episode).toHaveProperty('title', 'Q&A');
      expect(episode).toHaveProperty('type', 'episode');
      expect(episode).toHaveProperty('year', '2012');
      expect(episode.searchMatches).toBeUndefined();
    });

    it('should search by movie title and year and store it', async() => {
      const response = await got(`${appUrl}/api/media/title?title=The Grinch&year=2018`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body).toHaveProperty('_id');

      const movie = await MediaMetadataModel.findOne({ searchMatches: { $in: ['The Grinch'] } });
      expect(movie).toHaveProperty('_id');
      expect(movie).toHaveProperty('imdbID', 'tt2709692');
      expect(movie).toHaveProperty('title', 'The Grinch');
      expect(movie).toHaveProperty('type', 'movie');
      expect(movie).toHaveProperty('year', '2018');
      expect(movie).toHaveProperty('plot');
      expect(movie.searchMatches).toBeUndefined();
    });

    it('should require title as query param', async() => {
      try {
        await got(`${appUrl}/api/media/title`, { responseType: 'json' });
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual('Response code 422 (Unprocessable Entity)');
      }
    });

    it('should return best match for movie titles which return many search results from OMDb', async() => {
      const response = await got(`${appUrl}/api/media/title?title=The Matrix Reloaded&year=2003`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toBe('The Matrix Reloaded');
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
    it('should search by series title, season and episode numbers, and store it, and not return searchMatches', async() => {
      const response = await got(`${appUrl}/api/media/v2/title?title=Homeland&season=2&episode=5`, { responseType: 'json' });
      expect(response.body).toHaveProperty('_id');
      expect(response.body).not.toHaveProperty('searchMatches');

      const episode = await MediaMetadataModel.findOne({ searchMatches: { $in: ['Homeland'] } });
      expect(episode).toHaveProperty('_id');
      expect(episode).toHaveProperty('episode', '5');
      expect(episode).toHaveProperty('imdbID', 'tt2325080');
      expect(episode).toHaveProperty('season', '2');
      expect(episode).toHaveProperty('seriesIMDbID', 'tt1796960');
      expect(episode).toHaveProperty('title', 'Q&A');
      expect(episode).toHaveProperty('type', 'episode');
      expect(episode).toHaveProperty('year', '2012');
      expect(episode.searchMatches).toBeUndefined();
    });

    it('should search by movie title and year and store it', async() => {
      const response = await got(`${appUrl}/api/media/v2/title?title=The Grinch&year=2018`, { responseType: 'json' });
      expect(response.body).toHaveProperty('_id');

      const movie = await MediaMetadataModel.findOne({ searchMatches: { $in: ['The Grinch'] } });
      expect(movie).toHaveProperty('_id');
      expect(movie).toHaveProperty('imdbID', 'tt2709692');
      expect(movie).toHaveProperty('title', 'The Grinch');
      expect(movie).toHaveProperty('type', 'movie');
      expect(movie).toHaveProperty('year', '2018');
      expect(movie).toHaveProperty('plot');
      expect(movie.searchMatches).toBeUndefined();
    });

    it(`
      should not return a movie result when looking for an episode
      should not return an episode when looking for a movie
    `, async() => {
      await MediaMetadataModel.create(aloneMovieMetaData);

      let response = await got(`${appUrl}/api/media/v2/title?title=Alone&season=1&episode=1`, { responseType: 'json' });
      expect(response.body).toHaveProperty('_id');

      const episode = await MediaMetadataModel.findOne({ searchMatches: { $in: ['Alone'] }, season: '1', episode: '1' });
      expect(episode).toHaveProperty('episode', aloneEpisodeMetaData.episode);
      expect(episode).toHaveProperty('imdbID', aloneEpisodeMetaData.imdbID);
      expect(episode).toHaveProperty('season', aloneEpisodeMetaData.season);
      expect(episode).toHaveProperty('title', aloneEpisodeMetaData.title);
      expect(episode).toHaveProperty('type', aloneEpisodeMetaData.type);
      expect(episode).toHaveProperty('year', aloneEpisodeMetaData.year);

      response = await got(`${appUrl}/api/media/v2/title?title=Alone&year=2020`, { responseType: 'json' });
      expect(response.body).toHaveProperty('genres', aloneMovieMetaData.genres);
      expect(response.body).toHaveProperty('imdbID', aloneMovieMetaData.imdbID);
      expect(response.body).toHaveProperty('title', aloneMovieMetaData.title);
      expect(response.body).toHaveProperty('type', aloneMovieMetaData.type);
      expect(response.body).toHaveProperty('year', aloneMovieMetaData.year);
    });

    it('should require title as query param', async() => {
      try {
        await got(`${appUrl}/api/media/v2/title`, { responseType: 'json' });
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual('Response code 422 (Unprocessable Entity)');
      }
    });

    it('should return best match for movie titles which return many search results from OMDb', async() => {
      const response = await got(`${appUrl}/api/media/v2/title?title=The Matrix Reloaded&year=2003`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toBe('The Matrix Reloaded');
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
    it('should return a movie by imdbid', async() => {
      const response = await got(`${appUrl}/api/media/imdbid?imdbid=tt0462538`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('The Simpsons Movie');
      expect(response.body.type).toEqual('movie');
    });

    it('should return a series by imdbid', async() => {
      const response = await got(`${appUrl}/api/media/imdbid?imdbid=tt1796960`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Homeland');
      expect(response.body.type).toEqual('series');
    });

    it('should return an episode by imdbid', async() => {
      const response = await got(`${appUrl}/api/media/imdbid?imdbid=tt3388032`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body.title).toEqual('Proof of Concept');
      expect(response.body.type).toEqual('episode');
    });

    it('should NOT create a failed lookup document when IMDB api is down', async() => {
      let error;
      try {
        await got(`${appUrl}/api/media/imdbid?imdbid=mocked-outage-id`, { responseType: 'json' });
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Response code 503 (Service Unavailable)');
      expect(await FailedLookupsModel.countDocuments({})).toEqual(0);
    });
  });
});
