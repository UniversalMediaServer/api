import * as mongoose from 'mongoose';
import * as _ from 'lodash';
import { MongoMemoryServer } from 'mongodb-memory-server';
import FailedLookupsModel from '../../src/models/FailedLookups';

const mongod = await MongoMemoryServer.create();

describe('Failed Lookups Model', () => {
  beforeAll(async() => {
    const mongoUrl = mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
  });

  afterAll(async() => {
    await mongoose.disconnect();
  });

  it('should require osdb hash or title', async() => {
    let err: Error;
    try {
      await FailedLookupsModel.create({});
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('FailedLookups validation failed: title: Path `title` is required., osdbHash: Path `osdbHash` is required.');
  });

  it('should validate for a valid osdb hash', async() => {
    let err: Error;
    try {
      await FailedLookupsModel.create({ osdbHash: 'a3e8hm1' });
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('FailedLookups validation failed: osdbHash: Invalid osdb hash length.');
  });

  describe('Indexes', () => {
    it('should use index when find by osdbHash', async() => {
      await FailedLookupsModel.init();
      await FailedLookupsModel.create({ osdbHash: '8e245d9679d31e12' });
      const response = await FailedLookupsModel.findOne({ osdbHash: '8e245d9679d31e12' }, {}, { explain: true }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'stage'])).toEqual('IXSCAN');
    });

    it('should use index when find by title', async() => {
      await FailedLookupsModel.create({ title: 'Jackass 2' });
      const response = await FailedLookupsModel.findOne({ title: 'Jackass 2' }, {}, { explain: true }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'stage'])).toEqual('IXSCAN');
    });
  });
});
