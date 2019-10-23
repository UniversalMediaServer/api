import MediaMetadataModel from '../../src/models/MediaMetadata';

import * as mongoose from 'mongoose';
import axios from 'axios';

import { MongoMemoryServer } from 'mongodb-memory-server';
const mongod = new MongoMemoryServer();

const mediaMetaData = { title: 'Interstellar', genres: ['Adventure', 'Drama', 'Sci-Fi'], osdbHash: '8e245d9679d31e12' };
const appUrl: string = 'http://localhost:3000'

describe('Media Metadata endpoints', () => {

  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    await MediaMetadataModel.create(mediaMetaData);
    require('../../bin/www');
  });

  afterAll(async() => {
    await MediaMetadataModel.deleteMany({});
    await mongoose.disconnect();
  });

  it('should return a valid response for existing media record with osdb hash', async() => {
    const res = await axios(`${appUrl}/api/media/8e245d9679d31e12`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('_id');
    expect(res.data).toHaveProperty('genres', ['Adventure', 'Drama', 'Sci-Fi'])
    expect(res.data).toHaveProperty('osdbHash', '8e245d9679d31e12')
    expect(res.data).toHaveProperty('title', 'Interstellar');
  });
    
});
