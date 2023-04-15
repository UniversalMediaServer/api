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

  it('should require osdb hash or title', async() => {
    let err: Error;
    try {
      await FailedLookups.create({});
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('FailedLookups validation failed: title: Path `title` is required., osdbHash: Path `osdbHash` is required.');
  });

  it('should validate for a valid osdb hash', async() => {
    let err: Error;
    try {
      await FailedLookups.create({ osdbHash: 'a3e8hm1' });
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('FailedLookups validation failed: osdbHash: Invalid osdb hash length.');
  });

  describe('Indexes', () => {
    it('should use index when find by osdbHash', async() => {
      await FailedLookups.init();
      await FailedLookups.create({ osdbHash: '8e245d9679d31e12' });
      const response = await FailedLookups.findOne({ osdbHash: '8e245d9679d31e12' }, {}, { explain: true }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'stage'])).toEqual('IXSCAN');
    });

    it('should use index when find by title', async() => {
      await FailedLookups.create({ title: 'Jackass 2' });
      const response = await FailedLookups.findOne({ title: 'Jackass 2' }, {}, { explain: true }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'stage'])).toEqual('IXSCAN');
    });
  });
});
