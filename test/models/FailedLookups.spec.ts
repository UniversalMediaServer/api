import * as mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import FailedLookupsModel from '../../src/models/FailedLookups';

const mongod = new MongoMemoryServer();

describe('Failed Lookups Model', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async() => {
    await mongoose.disconnect();
  });


  it('should require osdb hash', async() => {
    try {
      await FailedLookupsModel.create();
    } catch (e) {
      expect(e.message).toBe('FailedLookups validation failed: osdbHash: Path `osdbHash` is required.');
    }
  });

  it('should validate for a valid osdb hash', async() => {
    try {
      await FailedLookupsModel.create({osdbHash: 'a3e8hm1'});
    } catch (e) {
      expect(e.message).toBe('FailedLookups validation failed: osdbHash: Invalid osdb hash length.');
    }
  });
});
