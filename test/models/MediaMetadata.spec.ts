import * as  mongoose from 'mongoose';
import * as _ from 'lodash';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MediaMetadataModel from '../../src/models/MediaMetadata';

const mediaMetaData = {
  directors: ['Christopher Nolan'],
  episodeNumber: '3',
  genres: ['Adventure', 'Drama', 'Sci-Fi'],
  imdbID: 'tt0816692',
  osdbHash: '8e245d9679d31e12',
  searchMatches: ['Interstellar (2014)'],
  seasonNumber: '2',
  title: 'Interstellar',
  type: 'episode',
  year: '2014',
};

const mongod = new MongoMemoryServer();

describe('Media Metadata Model', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
  });

  beforeEach(async() => {
    await MediaMetadataModel.deleteMany({});
  });

  afterAll(async() => {
    await mongoose.disconnect();
  });

  it('should create Media Metadata record successfully', async() => {
    const savedMedia = await MediaMetadataModel.create(mediaMetaData);
    expect(savedMedia._id).toBeDefined();
    expect(savedMedia.title).toBe('Interstellar');
    expect(savedMedia.osdbHash).toBe('8e245d9679d31e12');
    expect(savedMedia.genres).toBeInstanceOf(Array);
  });

  it('should require title in a movie', async() => {
    const doc = _.cloneDeep(mediaMetaData);
    delete doc.title;
    doc.type = 'movie';
    let err: Error;
    try {
      await MediaMetadataModel.create(doc);
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('MediaMetadata validation failed: title: Path `title` is required.');
  });

  it('should allow empty title in an episode', async() => {
    const doc = _.cloneDeep(mediaMetaData);
    delete doc.title;
    const response = await MediaMetadataModel.create(doc);
    expect(response.year).toBe('2014');
  });

  it('should require episodeNumber for episodes but not for movies', async() => {
    const doc = _.cloneDeep(mediaMetaData);
    delete doc.seasonNumber;
    let err: Error;
    try {
      await MediaMetadataModel.create(doc);
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('MediaMetadata validation failed: seasonNumber: Path `seasonNumber` is required.');

    let err2: Error;
    doc.type = 'movie';
    try {
      await MediaMetadataModel.create(doc);
    } catch (e) {
      err2 = e;
    }
    expect(err2).toBeUndefined();
  });

  it('should validate for a valid osdb hash', async() => {
    const doc = _.cloneDeep(mediaMetaData);
    doc.osdbHash = 'a3e8hm1';
    let err: Error;
    try {
      await MediaMetadataModel.create(doc);
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('MediaMetadata validation failed: osdbHash: Invalid osdb hash length.');
  });

  it('should not store dummy episode titles', async() => {
    const doc = _.cloneDeep(mediaMetaData);
    doc.title = 'Episode #51';
    const record = await MediaMetadataModel.create(doc);
    expect(record.title).toBeUndefined();
  });

  it('should store real episode titles', async() => {
    const doc = _.cloneDeep(mediaMetaData);
    const record = await MediaMetadataModel.create(doc);
    expect(record).toHaveProperty('title', 'Interstellar');
  });

  describe('Virtuals', () => {
    it('should return imdburl', async() => {
      const doc = Object.assign({}, mediaMetaData);
      const record = await MediaMetadataModel.create(doc);
      expect(record).toHaveProperty('imdburl', 'https://www.imdb.com/title/tt0816692');
    });
  });

  describe('Indexes', () => {
    it('should use index when find by osdbHash', async() => {
      await MediaMetadataModel.create(mediaMetaData);
      const response = await MediaMetadataModel.findOne({ osdbHash: mediaMetaData.osdbHash }, null, { explain: 1 }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'inputStage', 'stage'])).toEqual('IXSCAN');
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'stage'])).toEqual('FETCH');
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'stage'])).toEqual('PROJECTION');
    });

    it('should use index when find by title', async() => {
      await MediaMetadataModel.create(mediaMetaData);
      const response = await MediaMetadataModel.findOne({ title: mediaMetaData.title }, null, { explain: 1 }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'inputStage', 'stage'])).toEqual('IXSCAN');
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'stage'])).toEqual('FETCH');
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'stage'])).toEqual('PROJECTION');
    });

    it('should use index when find by searchMatches', async() => {
      await MediaMetadataModel.create(mediaMetaData);
      const response = await MediaMetadataModel.findOne({ searchMatches: { $in: [mediaMetaData.searchMatches[0]] } }, null, { explain: 1 }).exec();
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'inputStage', 'stage'])).toEqual('IXSCAN');
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'inputStage', 'stage'])).toEqual('FETCH');
      expect(_.get(response, ['queryPlanner', 'winningPlan', 'inputStage', 'stage'])).toEqual('PROJECTION');
    });
  });
});
