import * as mongoose from 'mongoose';
import * as _ from 'lodash';
import { MongoMemoryServer } from 'mongodb-memory-server';
import FailedLookupsModel from '../../src/models/FailedLookups';

let mongod;

describe('Failed Lookups Model', () => {
  beforeAll(async() => {
    mongod = await MongoMemoryServer.create();
    const mongoUrl = mongod.getUri();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl);
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

    it('should use index when finding by osdbHash', async() => {
      await FailedLookupsModel.init();
      await FailedLookupsModel.create({ osdbHash: 'd4b51af0dc5fb268' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', year: '2020' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', year: '2020', osdbHash: 'd4b51af0dc5fb268' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', osdbHash: 'd4b51af0dc5fb268' });

      const response = await FailedLookupsModel.findOne(
        {
          '$or': [
            { osdbHash: 'd4b51af0dc5fb268' },
          ],
        },
        null,
        { explain: true },
      ).exec();
      const inputStages = _.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage']);
      expect(inputStages.keyPattern).toEqual({ osdbHash: 1 });
      expect(inputStages.stage).toEqual('IXSCAN');
    });

    it('should use index when find by title, year and osdbHash', async() => {
      await FailedLookupsModel.init();
      await FailedLookupsModel.create({ osdbHash: 'd4b51af0dc5fb268' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', year: '2020' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', year: '2020', osdbHash: 'd4b51af0dc5fb268' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', osdbHash: 'd4b51af0dc5fb268' });

      const response = await FailedLookupsModel.findOne(
        {
          '$or': [
            { osdbHash: 'd4b51af0dc5fb268' },
            { title: 'The Secrets we keep', year: '2020' },
          ],
        },
        null,
        { explain: true },
      ).exec();
      const inputStages = _.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'inputStage', 'inputStages']);
      inputStages.forEach((inputStage) => {
        expect(inputStage.stage).toEqual('IXSCAN');
      });
    });

    it('should use index when update by title, episode and season', async() => {
      await FailedLookupsModel.init();
      await FailedLookupsModel.create({ title: 'The Secrets we keep', episode: '1' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', episode: '1', season: '1' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', episode: '2', season: '1' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', episode: '3', season: '2' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', season: '1' });

      const response = await FailedLookupsModel.updateOne(
        { title: 'The Secrets we keep', episode: '1', season: '1' },
        { $inc: { count: 1 } },
        { explain: true },
      ).exec();
      const inputStages = _.get(response, ['queryPlanner', 'winningPlan', 'inputStage']);
      expect(inputStages.stage).toEqual('IXSCAN');
      expect(inputStages.keyPattern).toEqual({ title: 1, episode: 1, season: 1 });
    });

    it('should use index when update by episode, imdbID, osdbHash, season, title, and year', async() => {
      await FailedLookupsModel.init();
      await FailedLookupsModel.create({ osdbHash: 'd4b51af0dc5fb268' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', year: '2020' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', year: '2020', osdbHash: 'd4b51af0dc5fb268' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep' });
      await FailedLookupsModel.create({ title: 'The Secrets we keep', osdbHash: 'd4b51af0dc5fb268' });
      
      const response = await FailedLookupsModel.updateOne(
        { episode: '1', imdbID: 'tt9252488', osdbHash: 'd4b51af0dc5fb268', season: '1', title: 'The Secrets we keep', year: '2020' },
        { $inc: { count: 1 } },
        { explain: true },
      ).exec();
      const inputStages = _.get(response, ['queryPlanner', 'winningPlan', 'inputStage']);
      expect(inputStages.stage).toEqual('IXSCAN');
    });
  });
});
