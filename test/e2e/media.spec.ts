import MediaMetadataModel from '../../src/models/MediaMetadata';
import SeriesMetadataModel from '../../src/models/SeriesMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';

import * as mongoose from 'mongoose';
import got from 'got';
import * as stoppable from 'stoppable';

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
let server;

describe('Media Metadata endpoints', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
    await MediaMetadataModel.create(interstellarMetaData);
    require('../mocks');
    require('../opensubtitles-mocks');
    server = require('../../src/app').server;
    stoppable(server, 0);
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
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

    it('should not throw an exception when Open Subtitles passes bad data', async() => {
      await FailedLookupsModel.deleteMany({});
      const response: any = await got(`${appUrl}/api/media/a04cfbeafc4af7eb/884419440`);
      expect(response.body).toBe('Metadata not found on OpenSubtitles');
      const doc = await FailedLookupsModel.findOne({ osdbHash: 'a04cfbeafc4af7eb' });
      expect(doc).toHaveProperty('_id');
      expect(doc).toHaveProperty('osdbHash');
    });
  });

  describe('get by title', () => {
    it('should search by title and store it', async() => {
      const body = JSON.stringify({ title: 'Homeland S02E05' });
      const response = await got.post(`${appUrl}/api/media/title`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body).toHaveProperty('_id');

      const episode = await MediaMetadataModel.findOne({ searchMatches: { $in: ['Homeland S02E05'] } });
      expect(episode).toHaveProperty('_id');
      expect(episode).toHaveProperty('episodeNumber', '5');
      expect(episode).toHaveProperty('imdbID', 'tt2325080');
      expect(episode).toHaveProperty('seasonNumber', '2');
      expect(episode).toHaveProperty('seriesIMDbID', 'tt1796960');
      expect(episode).toHaveProperty('title', 'Q&A');
      expect(episode).toHaveProperty('type', 'episode');
      expect(episode).toHaveProperty('year', '2012');
      expect(episode.searchMatches).toBeUndefined();

      const series = await SeriesMetadataModel.findOne();
      expect(series).toHaveProperty('imdbID', 'tt1796960');
      expect(series).toHaveProperty('totalSeasons', 8);
      expect(series).toHaveProperty('title', 'Homeland');
      expect(series).toHaveProperty('startYear', '2011');
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
  describe('get series by directory or filename', () => {
    it('should return series metadata', async() => {
      let body = JSON.stringify({ title: 'Homeland S02E05' });
      // this request populates the series metadata
      let response: any = await got.post(`${appUrl}/api/media/seriestitle`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      const newDocumentId = response.body._id;
      const doc = await SeriesMetadataModel.findOne();
      expect(doc).toHaveProperty('totalSeasons', 8);
      expect(doc).toHaveProperty('title', 'Homeland');
      expect(doc).toHaveProperty('startYear', '2011');

      // similar searches should return the same series metadata document
      body = JSON.stringify({ title: 'Homeland Season one' });
      response = await got.post(`${appUrl}/api/media/seriestitle`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body._id).toEqual(newDocumentId);

      body = JSON.stringify({ title: 'HoMelAnD   ' });
      response = await got.post(`${appUrl}/api/media/seriestitle`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body._id).toEqual(newDocumentId);

      body = JSON.stringify({ title: 'Homeland series 1' });
      response = await got.post(`${appUrl}/api/media/seriestitle`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body._id).toEqual(newDocumentId);
    });
  });

  describe('get by imdbid', () => {
    it('should return a movie by imdbid', async() => {
      const body = JSON.stringify({ imdbid: 'tt0462538' });
      const response: any = await got.post(`${appUrl}/api/media/imdbid`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body.title).toEqual('The Simpsons Movie');
      expect(response.body.type).toEqual('movie');
    });

    it('should return a series by imdbid', async() => {
      const body = JSON.stringify({ imdbid: 'tt1796960' });
      const response: any = await got.post(`${appUrl}/api/media/imdbid`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body.title).toEqual('Homeland');
      expect(response.body.type).toEqual('series');
    });

    it('should return an episode by imdbid', async() => {
      const body = JSON.stringify({ imdbid: 'tt3388032' });
      const response: any = await got.post(`${appUrl}/api/media/imdbid`, { responseType: 'json', headers: { 'content-type': 'application/json' }, body });
      expect(response.body.title).toEqual('Proof of Concept');
      expect(response.body.type).toEqual('episode');
    });
  });
});
