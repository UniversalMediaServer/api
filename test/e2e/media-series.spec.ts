import axios from 'axios';
import mongoose, { HydratedDocument } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import FailedLookups from '../../src/models/FailedLookups';
import SeriesMetadata, { SeriesMetadataInterface } from '../../src/models/SeriesMetadata';
import { tmdb } from '../../src/services/tmdb-api';

interface UmsApiSeriesAxiosResponse  {
  status: number;
  data: HydratedDocument<SeriesMetadataInterface>;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server : stoppable;
let mongod: MongoMemoryServer;

const americanHorrorStorySeries = {
  title: 'American Horror Story',
  imdbID: 'tt1844624',
};

describe('Media Metadata endpoints', () => {
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
    await FailedLookups.deleteMany({});
    await SeriesMetadata.deleteMany({});
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

      response = await axios.get(`${appUrl}/api/media/series/v2?title=HoMelAnD   `);
      expect(response.data._id).toEqual(newDocumentId);
    });
    it('should return series metadata by IMDb ID', async() => {
      // This is the method that finds the TMDB ID from the IMDb ID
      const spy = jest.spyOn(tmdb, 'find');

      const response = await axios.get(`${appUrl}/api/media/series/v2?title=${americanHorrorStorySeries.title}&imdbID=${americanHorrorStorySeries.imdbID}`) as UmsApiSeriesAxiosResponse;
      expect(response.data).toHaveProperty('credits');
      expect(response.data).toHaveProperty('totalSeasons');
      expect(response.data).toHaveProperty('title', americanHorrorStorySeries.title);
      expect(response.data).toHaveProperty('startYear', '2011');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fail to save non series type', async() => {
      expect(await SeriesMetadata.countDocuments()).toBe(0);
      let err: any;
      try {
        await axios.get(`${appUrl}/api/media/series/v2?title=Not A Series Type`) as UmsApiSeriesAxiosResponse;
      } catch (e) {
        err = e;
      }
      expect(err).toBeTruthy();
      expect(await SeriesMetadata.countDocuments()).toBe(0);
    });

    it('should return series with correct year', async() => {
      // this request populates the series metadata
      let response = await axios.get(`${appUrl}/api/media/series/v2?title=Ben 10&year=2016`) as UmsApiSeriesAxiosResponse;
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
      const response = await axios.get(`${appUrl}/api/media/series/v2?title=Galactica&year=1980`) as UmsApiSeriesAxiosResponse;
      expect(response.data).toHaveProperty('title', 'Galactica 1980');
    });
  });

});
