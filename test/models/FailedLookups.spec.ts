import * as _ from 'lodash';
import * as mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import FailedLookups from '../../src/models/FailedLookups';

let mongod: MongoMemoryServer;

describe('Failed Lookups Model', () => {
  beforeAll(async() => {
    mongod = await MongoMemoryServer.create();
    const mongoUrl = mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl);
    mongoose.set('strictQuery', true);
  });

  afterAll(async() => {
    await mongoose.disconnect();
  });

  it('should require title', async() => {
    let err: Error;
    try {
      await FailedLookups.create({});
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('FailedLookups validation failed: title: Path `title` is required.');
  });

  describe('Indexes', () => {
    it('should use index when find by title', async() => {
      await FailedLookups.init();
      await FailedLookups.create({ title: 'Jackass 2' });
      const response = await FailedLookups.findOne({ title: 'Jackass 2' }, {}, { explain: true }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'stage'])).toEqual('EXPRESS_IXSCAN');
    });
  });
});
