/* eslint-disable @typescript-eslint/camelcase */
import TMDBConfigurationModel, { TMDBConfigurationInterface } from '../../src/models/TMDBConfiguration';

import * as mongoose from 'mongoose';
import got from 'got';
import * as stoppable from 'stoppable';

import { MongoMemoryServer } from 'mongodb-memory-server';
let mongod;

interface UmsApiGotResponse  {
  statusCode: number;
  body: TMDBConfigurationInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server;

describe('Info endpoint', () => {
  beforeAll(async() => {
    mongod = await MongoMemoryServer.create();
    const mongoUrl = mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
    server = require('../../src/app').server;
    stoppable(server, 0);
  });

  beforeEach(async() => {
    await TMDBConfigurationModel.deleteMany({});
  });

  afterAll(async() => {
    server.stop();
    await mongoose.connection.dropDatabase();
  });

  it('should return configuration', async() => {
    const response = await got(`${appUrl}/api/configuration`, { responseType: 'json' }) as UmsApiGotResponse;

    expect(response.body).toHaveProperty('imageBaseURL');
    expect(response.body.imageBaseURL).toContain('https://image.tmdb.org/');
  });
});
