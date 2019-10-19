import * as  mongoose from 'mongoose';
import MediaMetadataModel from '../../src/models/MediaMetadata';
const mediaMetaData = { title: 'Interstellar', genres: ['Adventure', 'Drama', 'Sci-Fi'] };
// @ts-ignore
const MongoUrl:any = global.__MONGO_URI__;
describe('Media Metadata Model', () => {

  beforeAll(async() => {
    await mongoose.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async() => {
    await mongoose.disconnect();
  });

  it('should create Media Metadata record successfully', async() => {
    const savedMedia = await MediaMetadataModel.create(mediaMetaData);
    expect(savedMedia._id).toBeDefined();
    expect(savedMedia.title).toBe('Interstellar');
    expect(savedMedia.genres).toBeInstanceOf(Array);
  });

  it('should require title in document', async() => {
    try {
      await MediaMetadataModel.create({});
    } catch(e) {
      expect(e.message).toBe('MediaMetadata validation failed: title: Path `title` is required.');
    }
    
  });
    
});
