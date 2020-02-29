import MediaMetadataModel from '../../src/models/MediaMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';

import * as mongoose from 'mongoose';
import got from 'got';

import { MongoMemoryServer } from 'mongodb-memory-server';
const mongod = new MongoMemoryServer();

const interstellarMetaData = { title: 'Interstellar', genres: ['Adventure', 'Drama', 'Sci-Fi'], osdbHash: 'f4245d9379d31e33' };
const appUrl = 'http://localhost:3000';

describe('Media Metadata endpoints', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    await MediaMetadataModel.create(interstellarMetaData);
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
      expect(res.body).toHaveProperty('genres', ['Adventure', 'Drama', 'Sci-Fi']);
      expect(res.body).toHaveProperty('osdbHash', interstellarMetaData.osdbHash);
      expect(res.body).toHaveProperty('title', 'Interstellar');
    });
  
    it('should return a valid response for a new osdbhash, then store it', async() => {
      // using example file from https://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes
      const res: any = await got(`${appUrl}/api/media/8e245d9679d31e12/12909756`, { responseType: 'json' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('year', '2007');
      expect(res.body).toHaveProperty('osdbHash', '8e245d9679d31e12');
      expect(res.body).toHaveProperty('title', 'The Simpsons Movie');
      expect(res.body).toHaveProperty('imdbID', 'tt0462538');
      expect(res.body).toHaveProperty('subcount', '7');
      expect(res.body).toHaveProperty('type', 'movie');
      expect(res.body).toHaveProperty('goofs');
      expect(res.body).toHaveProperty('trivia');
      expect(res.body).toHaveProperty('tagline');
  
      // should save to db
      const doc = await MediaMetadataModel.findOne({ osdbHash: res.body.osdbHash });
  
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('year', '2007');
      expect(doc).toHaveProperty('osdbHash', '8e245d9679d31e12');
      expect(doc).toHaveProperty('title', 'The Simpsons Movie');
      expect(doc).toHaveProperty('imdbID', 'tt0462538');
      expect(doc).toHaveProperty('subcount', '7');
      expect(doc).toHaveProperty('type', 'movie');
      expect(doc).toHaveProperty('goofs');
      expect(doc).toHaveProperty('trivia');
      expect(doc).toHaveProperty('tagline');
    });
  
    it('should create a failed lookup document when Open Subtitles cannot find metadata', async() => {
      await FailedLookupsModel.deleteMany({});
      const response: any = await got(`${appUrl}/api/media/f4245d9379d31e30/1234`, { responseType: 'json' });
      expect(response.body).toBe('Metadata not found on OpenSubtitles');
      const doc = await FailedLookupsModel.findOne({ osdbHash: 'f4245d9379d31e30' });
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('osdbHash');
    });
  });

  describe('get by title', () => {
    it('should search by title and store it', async() => {
      const body = JSON.stringify({ title: 'Homeland S02E05' });
      const response: any = await got.post(`${appUrl}/api/media/title`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body).toEqual({
        episodeNumber: '5',
        imdbID: 'tt2325080',
        metadata: { language: 'eng' },
        seasonNumber: '2',
        title: '"Homeland" Q&A',
        type: 'episode',
        year: '2012',
      });

      // should save to db
      const doc = await MediaMetadataModel.findOne({ title: '"Homeland" Q&A' });
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('episodeNumber', '5');
      expect(doc).toHaveProperty('seasonNumber', '2');
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
