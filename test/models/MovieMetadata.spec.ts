import * as  mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MediaMetadataModel from '../../src/models/MediaMetadata';

const mediaMetaData = {
  directors: ['Christopher Nolan'],
  episodeNumber: '3',
  episodeTitle: 'Episode #51',
  genres: ['Adventure', 'Drama', 'Sci-Fi'],
  imdbID: 'tt0816692',
  osdbHash: '8e245d9679d31e12',
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

  it('should require title in document', async() => {
    const doc = Object.assign({}, mediaMetaData);
    delete doc.title;
    let err: Error;
    try {
      await MediaMetadataModel.create(doc);
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('MediaMetadata validation failed: title: Path `title` is required.');
  });

  it('should require episodeNumber for episodes but not for movies', async() => {
    const doc = Object.assign({}, mediaMetaData);
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
    const doc = Object.assign({}, mediaMetaData);
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
    const doc = Object.assign({}, mediaMetaData);
    const record = await MediaMetadataModel.create(doc);
    expect(record).toHaveProperty('title', 'Interstellar');
    expect(record.episodeTitle).toBeUndefined();
  });

  it('should store real episode titles', async() => {
    const doc = Object.assign({}, mediaMetaData);
    doc.episodeTitle = 'Pilot';
    const record = await MediaMetadataModel.create(doc);
    expect(record).toHaveProperty('title', 'Interstellar');
    expect(record).toHaveProperty('episodeTitle', 'Pilot');
  });

  describe('Virtuals', () => {
    it('should return imdburl', async() => {
      const doc = Object.assign({}, mediaMetaData);
      const record = await MediaMetadataModel.create(doc);
      expect(record).toHaveProperty('imdburl', 'https://www.imdb.com/title/tt0816692');
    });
  });
});
