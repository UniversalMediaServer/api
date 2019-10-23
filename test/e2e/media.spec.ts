import MediaMetadataModel from '../../src/models/MediaMetadata';

import * as mongoose from 'mongoose';
import axios from 'axios';

import { MongoMemoryServer } from 'mongodb-memory-server-core';
const mongod = new MongoMemoryServer();

const mediaMetaData = { title: 'Interstellar', genres: ['Adventure', 'Drama', 'Sci-Fi'], osdbHash: 'f4245d9379d31e33' };
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
    const res = await axios(`${appUrl}/api/media/f4245d9379d31e33/1234`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('_id');
    expect(res.data).toHaveProperty('genres', ['Adventure', 'Drama', 'Sci-Fi'])
    expect(res.data).toHaveProperty('osdbHash', 'f4245d9379d31e33')
    expect(res.data).toHaveProperty('title', 'Interstellar');
  });

  it('should return a valid response for a new osdbhash, then store it', async() => {
    // using example file from https://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes
    const res = await axios(`${appUrl}/api/media/8e245d9679d31e12/12909756`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('_id');
    expect(res.data).toHaveProperty('year', '2007');
    expect(res.data).toHaveProperty('osdbHash', '8e245d9679d31e12')
    expect(res.data).toHaveProperty('title', 'The Simpsons Movie');
    expect(res.data).toHaveProperty('imdbID', 'tt0462538');

    // should save to db
    let doc = await MediaMetadataModel.findOne({osdbHash: res.data.osdbHash});

    expect(doc).toHaveProperty('_id');
    expect(doc).toHaveProperty('year', '2007');
    expect(doc).toHaveProperty('osdbHash', '8e245d9679d31e12')
    expect(doc).toHaveProperty('title', 'The Simpsons Movie');
    expect(doc).toHaveProperty('imdbID', 'tt0462538');
  });
    
});
