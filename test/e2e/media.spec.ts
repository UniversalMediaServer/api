import MediaMetadataModel, { MediaMetadataInterfaceDocument } from '../../src/models/MediaMetadata';
import SeasonMetadataModel from '../../src/models/SeasonMetadata';
import SeriesMetadataModel, { SeriesMetadataInterface } from '../../src/models/SeriesMetadata';
import FailedLookupsModel from '../../src/models/FailedLookups';
import { tmdb } from '../../src/services/tmdb-api';

import * as mongoose from 'mongoose';
import axios from 'axios';
import * as stoppable from 'stoppable';
import app, { PORT } from '../../src/app';

import { MongoMemoryServer } from 'mongodb-memory-server';
let mongod;

interface UmsApiAxiosResponse  {
  status: number;
  data: MediaMetadataInterfaceDocument;
  headers?: object;
}

interface UmsApiSeriesAxiosResponse  {
  status: number;
  data: SeriesMetadataInterface;
  headers?: object;
}

const americanHorrorStorySeries = {
  title: 'American Horror Story',
  imdbID: 'tt1844624',
}

const appUrl = 'http://localhost:3000';
let server;

describe('Media Metadata endpoints', () => {
  beforeAll((done) => {
    require('../mocks');
    require('../opensubtitles-mocks');
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
        });
      });
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
      let response = await axios.get(`${appUrl}/api/media/series/v2?title=Homeland S02E05`) as UmsApiSeriesAxiosResponse;
      const newDocumentId = response.data._id;
      expect(response.data.totalSeasons).toBe(8);
      expect(response.data.title).toBe('Homeland');
      expect(response.data.startYear).toBe('2011');
      expect(response.data.poster).toContain('https://');

      response = await axios.get(`${appUrl}/api/media/series/v2?title=HoMelAnD   `);
      expect(response.data._id).toEqual(newDocumentId);
    });
    it('should return series metadata by IMDb ID', async() => {
      // This is the method that finds the TMDB ID from the IMDb ID
      const spy = jest.spyOn(tmdb, 'find');

      const response = await axios.get(`${appUrl}/api/media/series/v2?title=${americanHorrorStorySeries.title}&imdbID=${americanHorrorStorySeries.imdbID}`) as UmsApiAxiosResponse;
      expect(response.data).toHaveProperty('credits');
      expect(response.data).toHaveProperty('totalSeasons');
      expect(response.data).toHaveProperty('title', americanHorrorStorySeries.title);
      expect(response.data).toHaveProperty('startYear', '2011');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fail to save non series type', async() => {
      expect(await SeriesMetadataModel.countDocuments()).toBe(0);
      let err;
      try {
        await axios.get(`${appUrl}/api/media/series/v2?title=Not A Series Type`) as UmsApiAxiosResponse;
      } catch (e) {
        err = e;
      }
      expect(err).toBeTruthy();
      expect(await SeriesMetadataModel.countDocuments()).toBe(0);
    });

    it('should return series with correct year', async() => {
      // this request populates the series metadata
      let response = await axios.get(`${appUrl}/api/media/series/v2?title=Ben 10&year=2016`) as UmsApiAxiosResponse;
      let newDocumentId = response.data._id;
      expect(response.data).toHaveProperty('title', 'Ben 10');
      expect(response.data).toHaveProperty('startYear', '2016');

      // and cached
      response = await axios.get(`${appUrl}/api/media/series/v2?title=Ben 10&year=2016`);
      expect(response.data._id).toEqual(newDocumentId);

      // now a different year
      response = await axios.get(`${appUrl}/api/media/series/v2?title=Ben 10&year=2005`);
      newDocumentId = response.data._id;
      expect(response.data).toHaveProperty('title', 'Ben 10');
      expect(response.data).toHaveProperty('startYear', '2005');

      // and cached
      response = await axios.get(`${appUrl}/api/media/series/v2?title=Ben 10&year=2005`);
      expect(response.data._id).toEqual(newDocumentId);

      // with no year, we should receive the earliest year
      response = await axios.get(`${appUrl}/api/media/series/v2?title=Ben 10`);
      expect(response.data._id).toEqual(newDocumentId);
    });

    it('should return series with misidentified year', async() => {
      await mongoose.connection.db.collection('series_metadata').insertOne({ imdbID: 'tt0080221', title: 'Galactica 1980' });

      // this request should find the result even though it's the wrong title
      const response = await axios.get(`${appUrl}/api/media/series/v2?title=Galactica&year=1980`) as UmsApiAxiosResponse;
      expect(response.data).toHaveProperty('title', 'Galactica 1980');
    });
  });

  describe('get season', () => {
    it('should return season metadata', async() => {
      // this request populates the series metadata
      const response = await axios.get(`${appUrl}/api/media/season?title=American Horror Story&season=2`) as UmsApiAxiosResponse;

      expect(response.data).toHaveProperty('airDate', '2012-10-17');
      expect(response.data).toHaveProperty('credits');
      expect(response.data).toHaveProperty('externalIDs', [
        {
          'freebase_mid': '/m/0l96xr3',
          'freebase_id': null,
          'tvdb_id': 497727,
          'tvrage_id': null,
        },
      ]);
      expect(response.data).toHaveProperty('images');
      expect(response.data).toHaveProperty('name', 'Asylum');
      expect(response.data).toHaveProperty('overview', 'From Nazis and serial killers to mutants and aliens, no one is safe inside the walls of the Briarcliff Mental Institution. In a house of healing that is anything but, troubled nun Sister Jude rules with an iron fist and Dr Arden conducts strange experiments on the facility’s patients.');
      expect(response.data).toHaveProperty('seasonNumber', 2);
      expect(response.data).toHaveProperty('tmdbID', '3702');
    });
  });
});
