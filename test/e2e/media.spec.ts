import MediaMetadataModel, { MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';
import SeasonMetadataModel from '../../src/models/SeasonMetadata';
import SeriesMetadataModel, { SeriesMetadataInterface } from '../../src/models/SeriesMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';
import { tmdb } from '../../src/services/tmdb-api';

import * as mongoose from 'mongoose';
import axios from 'axios';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';
let mongod;

interface UmsApiGotResponse  {
  statusCode: number;
  body: MediaMetadataInterfaceDocument;
  headers?: object;
}

interface UmsApiSeriesGotResponse  {
  statusCode: number;
  body: SeriesMetadataInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server;

describe('Media Metadata endpoints', () => {
  beforeAll(async() => {
    mongod = await MongoMemoryServer.create();
    const mongoUrl = mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl);
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

  describe('get series', () => {
    it('should return series metadata by title', async() => {
      // this request populates the series metadata
      let response = await axios.get(`${appUrl}/api/media/seriestitle?title=Homeland S02E05`) as UmsApiSeriesGotResponse;
      const newDocumentId = response.body._id;
      expect(response.body.totalSeasons).toBe(8);
      expect(response.body.title).toBe('Homeland');
      expect(response.body.startYear).toBe('2011');
      expect(response.body.poster).toContain('https://');

      response = await axios.get(`${appUrl}/api/media/seriestitle?title=HoMelAnD   `);
      expect(response.body._id).toEqual(newDocumentId);
    });
    it('should return series metadata by IMDb ID', async() => {
      // This is the method that finds the TMDB ID from the IMDb ID
      const spy = jest.spyOn(tmdb, 'find');

      const response = await axios.get(`${appUrl}/api/media/seriestitle?title=American Horror Story&imdbID=tt1844624`) as UmsApiGotResponse;
      expect(response.body).toHaveProperty('credits');
      expect(response.body).toHaveProperty('totalSeasons');
      expect(response.body).toHaveProperty('title', 'American Horror Story');
      expect(response.body).toHaveProperty('startYear', '2011');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fail to save non series type', async() => {
      expect(await SeriesMetadataModel.countDocuments()).toBe(0);
      let err;
      try {
        await axios.get(`${appUrl}/api/media/seriestitle?title=Not A Series Type`) as UmsApiGotResponse;
      } catch (e) {
        err = e;
      }
      expect(err).toBeTruthy();
      expect(await SeriesMetadataModel.countDocuments()).toBe(0);
    });

    it('should return series with correct year', async() => {
      // this request populates the series metadata
      let response = await axios.get(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2016`) as UmsApiGotResponse;
      let newDocumentId = response.body._id;
      expect(response.body).toHaveProperty('title', 'Ben 10');
      expect(response.body).toHaveProperty('startYear', '2016');

      // and cached
      response = await axios.get(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2016`);
      expect(response.body._id).toEqual(newDocumentId);

      // now a different year
      response = await axios.get(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2005`);
      newDocumentId = response.body._id;
      expect(response.body).toHaveProperty('title', 'Ben 10');
      expect(response.body).toHaveProperty('startYear', '2005');

      // and cached
      response = await axios.get(`${appUrl}/api/media/seriestitle?title=Ben 10&year=2005`);
      expect(response.body._id).toEqual(newDocumentId);

      // with no year, we should receive the earliest year
      response = await axios.get(`${appUrl}/api/media/seriestitle?title=Ben 10`);
      expect(response.body._id).toEqual(newDocumentId);
    });

    it('should return series with misidentified year', async() => {
      await mongoose.connection.db.collection('series_metadata').insertOne({ imdbID: 'tt0080221', title: 'Galactica 1980' });

      // this request should find the result even though it's the wrong title
      const response = await axios.get(`${appUrl}/api/media/seriestitle?title=Galactica&year=1980`) as UmsApiGotResponse;
      expect(response.body).toHaveProperty('title', 'Galactica 1980');
    });
  });

  describe('get season', () => {
    it('should return season metadata', async() => {
      // this request populates the series metadata
      const response = await axios.get(`${appUrl}/api/media/season?title=American Horror Story&season=2`) as UmsApiGotResponse;

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
