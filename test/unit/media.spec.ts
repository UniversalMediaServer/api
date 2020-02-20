import * as mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import FailedLookupsModel from '../../src/models/FailedLookups';
import * as MediaController from '../../src/controllers/media';

const mongod = new MongoMemoryServer();

describe('Media functions', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async() => {
    await mongoose.disconnect();
  });

  describe('isSkipFailedLookup()', () => {
    it(`should return false for record less than ${MediaController.FAILED_LOOKUP_SKIP_DAYS} days old`, async() => {
      await FailedLookupsModel.create({ osdbHash: 'f4245d9379d31e30' });
      expect(await MediaController.isSkipFailedLookup({ osdbHash: 'f4245d9379d31e30' })).toEqual(false);
    });

    it('should return false for record not found', async() => {
      expect(await MediaController.isSkipFailedLookup({ osdbHash: '0000000000000000' })).toEqual(false);
    });
  });
});
