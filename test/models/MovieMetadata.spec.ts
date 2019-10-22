import * as  mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MediaMetadataModel from '../../src/models/MediaMetadata';
const mediaMetaData = { title: 'Interstellar', genres: ['Adventure', 'Drama', 'Sci-Fi'], osdbHash: '8e245d9679d31e12' };

const mongod = new MongoMemoryServer();

describe('Media Metadata Model', () => {

  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
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
    try {
      await MediaMetadataModel.create(doc);
    } catch(e) {
      expect(e.message).toBe('MediaMetadata validation failed: title: Path `title` is required.');
    }
    
  });

  it('should require osdb hash', async() => {
    const doc = Object.assign({}, mediaMetaData);
    delete doc.osdbHash;
    try {
      await MediaMetadataModel.create(doc);
    } catch(e) {
      expect(e.message).toBe('MediaMetadata validation failed: osdbHash: Path `osdbHash` is required.');
    }
    
  });

  it('should validate for a valid osdb hash', async() => {
    const doc = Object.assign({}, mediaMetaData);
    doc.osdbHash = 'a3e8hm1';
    try {
      await MediaMetadataModel.create(doc);
    } catch(e) {
      expect(e.message).toBe('MediaMetadata validation failed: osdbHash: Invalid osdb hash length.');
    }
    
  });
    
});
