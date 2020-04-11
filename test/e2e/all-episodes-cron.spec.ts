import MediaMetadata from '../../src/models/MediaMetadata';
import SeriesMetadata from '../../src/models/SeriesMetadata';
import EpisodeProcessing from '../../src/models/EpisodeProcessing';
import * as _ from 'lodash';

import * as mongoose from 'mongoose';

import { MongoMemoryServer } from 'mongodb-memory-server';
const mongod = new MongoMemoryServer();

describe('Episode processing cron job', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
    await EpisodeProcessing.create({ seriesimdbid: 'tt3581932' });
    require('../mocks');
    const cron = require('../../src/cron/all-episodes');
    await cron.processEpisodes();
  });

  afterAll(async() => {
    await MediaMetadata.deleteMany({});
    await EpisodeProcessing.deleteMany({});
    await SeriesMetadata.deleteMany({});
    await mongoose.disconnect();
  });

  it('should create MediaMetadata and SeriesMetadata documents for each episode', async() => {
    const series = await SeriesMetadata.find({});
    const episodes = await MediaMetadata.find({});

    expect(series[0].imdbID).toEqual('tt3581932');
    expect(series[0].title).toEqual('And Then There Were None');

    expect(series.length).toEqual(1);
    expect(episodes.length).toEqual(3);

    const episodeOne = _.find(episodes, { episodeNumber: '1' });
    const episodeTwo = _.find(episodes, { episodeNumber: '2' });
    const episodeThree = _.find(episodes, { episodeNumber: '3' });

    expect(episodeOne.imdbID).toEqual('tt3591512');
    expect(episodeTwo.imdbID).toEqual('tt3595914');
    expect(episodeThree.imdbID).toEqual('tt3595916');
  });

  it('should remove processed EpisodeProcessing documents', async() => {
    expect(await EpisodeProcessing.countDocuments({})).toEqual(0);
  });
});
