/* eslint-disable @typescript-eslint/camelcase */
import MediaMetadataModel, {  MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';
import SeasonMetadataModel from '../../src/models/SeasonMetadata';
import SeriesMetadataModel from '../../src/models/SeriesMetadata';
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
    await SeasonMetadataModel.deleteMany({});
    await SeriesMetadataModel.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  describe('get series by directory or filename', () => {
    it('should return series metadata', async() => {
      // this request populates the series metadata
      let response = await got(`${appUrl}/api/media/seriestitle?title=Homeland S02E05`, { responseType: 'json' }) as UmsApiGotResponse;
      const newDocumentId = response.body._id;
      const doc = await SeriesMetadataModel.findOne();
      expect(doc).toHaveProperty('totalSeasons', 8);
      expect(doc).toHaveProperty('title', 'Homeland');
      expect(doc).toHaveProperty('startYear', '2011');

      response = await got(`${appUrl}/api/media/seriestitle?title=HoMelAnD   `, { responseType: 'json' });
      expect(response.body._id).toEqual(newDocumentId);
    });

    it('should fail to save non series type', async() => {
      expect(await SeriesMetadataModel.countDocuments()).toBe(0);
      let err;
      try {
        await got(`${appUrl}/api/media/seriestitle?title=Not A Series Type`, { responseType: 'json' }) as UmsApiGotResponse;
      } catch (e) {
        err = e;
      }
      expect(err).toBeTruthy();
      expect(await SeriesMetadataModel.countDocuments()).toBe(0);
    });

    it('should return series with correct year', async() => {
      // this request populates the series metadata
      let response = await got(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2016`, { responseType: 'json' }) as UmsApiGotResponse;
      let newDocumentId = response.body._id;
      expect(response.body).toHaveProperty('title', 'Ben 10');
      expect(response.body).toHaveProperty('startYear', '2016');

      // and cached
      response = await got(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2016`, { responseType: 'json' });
      expect(response.body._id).toEqual(newDocumentId);

      // now a different year
      response = await got(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2005`, { responseType: 'json' });
      newDocumentId = response.body._id;
      expect(response.body).toHaveProperty('title', 'Ben 10');
      expect(response.body).toHaveProperty('startYear', '2005');

      // and cached
      response = await got(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2005`, { responseType: 'json' });
      expect(response.body._id).toEqual(newDocumentId);

      // with no year, we should receive the earliest year
      response = await got(`${appUrl}/api/media/seriestitle?title=Ben 10`, { responseType: 'json' });
      expect(response.body._id).toEqual(newDocumentId);
    });

    it('should return series with misidentified year', async() => {
      await mongoose.connection.db.collection('series_metadata').insertOne({ imdbID: 'tt0080221', title: 'Galactica 1980' });

      // this request should find the result even though it's the wrong title
      const response = await got(`${appUrl}/api/media/seriestitle?title=Galactica&year=1980`, { responseType: 'json' }) as UmsApiGotResponse;
      expect(response.body).toHaveProperty('title', 'Galactica 1980');
    });
  });

  describe('get season', () => {
    it('should return season metadata', async() => {
      // this request populates the series metadata
      const response = await got(`${appUrl}/api/media/season?title=American Horror Story&season=2`, { responseType: 'json' }) as UmsApiGotResponse;

      expect(response.body).toHaveProperty('airDate', '2012-10-17');
      expect(response.body).toHaveProperty('credits');
      expect(response.body).toHaveProperty('externalIDs', [
        {
          'freebase_mid': '/m/0l96xr3',
          'freebase_id': null,
          'tvdb_id': 497727,
          'tvrage_id': null,
        },
      ]);
      expect(response.body).toHaveProperty('images');
      expect(response.body).toHaveProperty('name', 'Asylum');
      expect(response.body).toHaveProperty('overview', 'From Nazis and serial killers to mutants and aliens, no one is safe inside the walls of the Briarcliff Mental Institution. In a house of healing that is anything but, troubled nun Sister Jude rules with an iron fist and Dr Arden conducts strange experiments on the facility’s patients.');
      expect(response.body).toHaveProperty('seasonNumber', 2);
      expect(response.body).toHaveProperty('tmdbID', '3702');
    });
  });
});
