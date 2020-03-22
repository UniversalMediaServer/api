import MediaMetadataModel from '../../src/models/MediaMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';

import * as mongoose from 'mongoose';
import got from 'got';

import { MongoMemoryServer } from 'mongodb-memory-server';
const mongod = new MongoMemoryServer();

const interstellarMetaData = {
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
const appUrl = 'http://localhost:3000';

describe('Media Metadata endpoints', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    await MediaMetadataModel.create(interstellarMetaData);
    require('../mocks');
    require('../../src/app');
  });

  afterAll(async() => {
    await MediaMetadataModel.deleteMany({});
    await mongoose.disconnect();
  });

  describe('get by osdb hash', () => {
    it('should return a valid response for existing media record with osdb hash', async() => {
      const res: any = await got(`${appUrl}/api/media/${interstellarMetaData.osdbHash}/1234`, { responseType: 'json' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('genres', interstellarMetaData.genres);
      expect(res.body).toHaveProperty('osdbHash', interstellarMetaData.osdbHash);
      expect(res.body).toHaveProperty('title', interstellarMetaData.title);
    });
  
    it('should return a valid response for a new osdbhash, then store it', async() => {
      // using example file from https://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes
      const res: any = await got(`${appUrl}/api/media/${theSimpsonsMetaData.osdbHash}/12909756`, { responseType: 'json' });
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
      expect(res.body).toHaveProperty('released', '2007-07-26T12:00:00.000Z');
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
      expect(doc).toHaveProperty('goofs');
      expect(doc).toHaveProperty('trivia');
      expect(doc).toHaveProperty('tagline');
    });
  
    it('should create a failed lookup document when Open Subtitles cannot find metadata', async() => {
      await FailedLookupsModel.deleteMany({});
      const response: any = await got(`${appUrl}/api/media/f4245d9379d31e30/1234`);
      expect(response.body).toBe('Metadata not found on OpenSubtitles');
      const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('osdbHash');
    });
  });

  describe('get by title', () => {
    it('should search by title and store it', async() => {
      const body = JSON.stringify({ title: 'Homeland S02E05' });
      await got.post(`${appUrl}/api/media/title`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });

      const doc = await MediaMetadataModel.findOne({ title: 'Homeland S02E05' });
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('episodeNumber', '5');
      expect(doc).toHaveProperty('seasonNumber');
      expect(doc).toHaveProperty('type', 'episode');
      expect(doc).toHaveProperty('year', '2012');
    });

    it('should require title in body', async() => {
      const body = JSON.stringify({});
      try {
        await got.post(`${appUrl}/api/media/title`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});
