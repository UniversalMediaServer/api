import axios from 'axios';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import TMDBConfiguration, { TMDBConfigurationInterface } from '../../src/models/TMDBConfiguration';
import { tmdb } from '../../src/services/tmdb-api';

interface UmsApiAxiosResponse  {
  status: number;
  data?: object;
  headers?: object;
}

interface UmsApiConfigurationAxiosResponse  {
  status: number;
  data: TMDBConfigurationInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server: stoppable;
let mongod: MongoMemoryServer;

describe('Info endpoint', () => {
  beforeAll((done) => {
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
        });
      });
  });

  beforeEach(async() => {
    await TMDBConfiguration.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  describe('root endpoint', () => {
    it('should return OK status', async() => {
      let response = await axios.get(`${appUrl}`) as UmsApiAxiosResponse;
      expect(response.data).toHaveProperty('status', 'OK');
    });
  });

  describe('API configuration endpoint', () => {
    it('should return configuration and store it', async() => {
      const spyGetFromTmdb = jest.spyOn(tmdb, 'configuration');
      let response = await axios.get(`${appUrl}/api/configuration`) as UmsApiConfigurationAxiosResponse;
      expect(response.data).toHaveProperty('imageBaseURL');
      expect(response.data.imageBaseURL).toContain('https://image.tmdb.org/');
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(1);
    });

    it('should return configuration from in-memory on multiple call', async() => {
      const spyGetFromTmdb = jest.spyOn(tmdb, 'configuration');
      let response = await axios.get(`${appUrl}/api/configuration`) as UmsApiConfigurationAxiosResponse;
      expect(response.data).toHaveProperty('imageBaseURL');
      expect(response.data.imageBaseURL).toContain('https://image.tmdb.org/');
      expect(spyGetFromTmdb).toHaveBeenCalledTimes(0);
    });
  });

  describe('API subversions endpoint', () => {
    it('should return subversions', async() => {
      let response = await axios.get(`${appUrl}/api/subversions`) as UmsApiAxiosResponse;
      expect(response.data).toHaveProperty('collection');
      expect(response.data).toHaveProperty('configuration');
      expect(response.data).toHaveProperty('localize');
      expect(response.data).toHaveProperty('season');
      expect(response.data).toHaveProperty('series');
      expect(response.data).toHaveProperty('video');
    });
  });

});
