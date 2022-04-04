import TMDBConfigurationModel, { TMDBConfigurationInterface } from '../../src/models/TMDBConfiguration';

import * as mongoose from 'mongoose';
import axios from 'axios';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';
import app, { PORT } from '../../src/app';
let mongod;

interface UmsApiAxiosResponse  {
  status: number;
  data: TMDBConfigurationInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server;

describe('Info endpoint', () => {
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
    await TMDBConfigurationModel.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  it('should return configuration', async() => {
    const response = await axios.get(`${appUrl}/api/configuration`) as UmsApiAxiosResponse;

    expect(response.data).toHaveProperty('imageBaseURL');
    expect(response.data.imageBaseURL).toContain('https://image.tmdb.org/');
  });
});
