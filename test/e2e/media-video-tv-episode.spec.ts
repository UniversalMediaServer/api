import axios from 'axios';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import stoppable from 'stoppable';

import app, { PORT } from '../../src/app';
import FailedLookupsModel from '../../src/models/FailedLookups';
import { MediaMetadataInterface } from '../../src/models/MediaMetadata';

interface UmsApiMediaAxiosResponse  {
  status: number;
  data: MediaMetadataInterface;
  headers?: object;
}

const appUrl = 'http://localhost:3000';
let server: stoppable;
let mongod: MongoMemoryServer;

const EPISODE_LOST = {
  'imdbID': 'tt0994359',
  'title': 'Confirmed Dead',
  'season': '4',
  'episode': '2',
  'seriesTitle': 'Lost',
  'seriesIMDbID': 'tt0411008',
};

const EPISODE_PRISONBREAK = {
  'title': 'Prison Break',
  'episodeTitle': 'Behind the Eyes',
  'season': '5',
  'episode': '9',
  'imdbID': 'tt5538198',
  'year': 2005,
  'seriesIMDbID': 'tt0455275',
};

const EPISODE_DOCTORWHO = {
  'episodeTitle': 'Lucky Day',
  'title': 'Doctor Who',
  'season': '2',
  'episode': '4',
  "seriesIMDbID": "tt31433814",
  'year': 2024,
};

const EPISODE_AVATAR = {
  'episodeTitle': 'The Boiling Rock (1) & The Boiling Rock (2)',
  'season': '3',
  'episode': '14-15',
  'imdbID': 'tt1176477',
  'year': 2005,
  'seriesIMDbID': 'tt0417299',
  'title': 'Avatar: The Last Airbender',
};

describe('get by all', () => {
  beforeAll((done) => {
    MongoMemoryServer.create()
      .then((value) => {
        mongod = value;
        const mongoUrl = mongod.getUri();
        process.env.MONGO_URL = mongoUrl;
        return mongoose.connect(mongoUrl);
      })
      .then(() => {
        mongoose.set('strictQuery', true);
        server = app.listen(PORT, () => {
          stoppable(server, 0);
          done();
        });
      });
  });

  beforeEach(async() => {
    await mongoose.connection.dropDatabase();
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  test('should return an episode by imdbid, from source APIs then store', async() => {
    let response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${EPISODE_LOST.imdbID}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(EPISODE_LOST.title);
    expect(response.data.type).toEqual('episode');

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?imdbID=${EPISODE_LOST.imdbID}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`);
    expect(response.data.title).toEqual(EPISODE_LOST.title);
    expect(response.data.type).toEqual('episode');
  });

  test('should return an episode by series title, from source APIs then store', async() => {
    let response = await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(EPISODE_LOST.title);
    expect(response.data.type).toEqual('episode');
    expect(response.data.imdbID).toEqual(EPISODE_LOST.imdbID);
    expect(response.data.seriesIMDbID).toEqual(EPISODE_LOST.seriesIMDbID);

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=${EPISODE_LOST.season}&episode=${EPISODE_LOST.episode}`);
    expect(response.data.title).toEqual(EPISODE_LOST.title);
    expect(response.data.type).toEqual('episode');
    expect(response.data.seriesIMDbID).toEqual(EPISODE_LOST.seriesIMDbID);
  });

  test('should return an episode by all possible params, from source APIs then store', async() => {
    const url = `${appUrl}/api/media/video/v2?`+
      `title=${EPISODE_PRISONBREAK.title}`+
      `&season=${EPISODE_PRISONBREAK.season}`+
      `&episode=${EPISODE_PRISONBREAK.episode}`+
      `&year=${EPISODE_PRISONBREAK.year}`;
    let response = await axios.get(url) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(EPISODE_PRISONBREAK.episodeTitle);
    expect(response.data.type).toEqual('episode');

    expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(url);
    expect(response.data.title).toEqual(EPISODE_PRISONBREAK.episodeTitle);
    expect(response.data.type).toEqual('episode');
    expect(response.data.seriesIMDbID).toEqual(EPISODE_PRISONBREAK.seriesIMDbID);
  });

  test('should return the episode from the correct series, when multiple series exist with different years, from source APIs then store', async() => {
    const url = `${appUrl}/api/media/video/v2?`+
      `title=${EPISODE_DOCTORWHO.title}`+
      `&season=${EPISODE_DOCTORWHO.season}`+
      `&episode=${EPISODE_DOCTORWHO.episode}`+
      `&year=${EPISODE_DOCTORWHO.year}`;
    let response = await axios.get(url) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(EPISODE_DOCTORWHO.episodeTitle);
    expect(response.data.type).toEqual('episode');

    expect(response.data.seriesIMDbID).toEqual(EPISODE_DOCTORWHO.seriesIMDbID);

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(url);
    expect(response.data.title).toEqual(EPISODE_DOCTORWHO.episodeTitle);
    expect(response.data.type).toEqual('episode');
    expect(response.data.seriesIMDbID).toEqual(EPISODE_DOCTORWHO.seriesIMDbID);
  });

  test('should return two episodes when passed all possible params, from source APIs then store', async() => {
    const url = `${appUrl}/api/media/video/v2?`+
      `title=${EPISODE_AVATAR.title}`+
      `&season=${EPISODE_AVATAR.season}`+
      `&episode=${EPISODE_AVATAR.episode}`+
      `&year=${EPISODE_AVATAR.year}`;
    let response = await axios.get(url) as UmsApiMediaAxiosResponse;
    expect(response.data.title).toEqual(EPISODE_AVATAR.episodeTitle);
    expect(response.data.type).toEqual('episode');
    expect(response.data.episode).toEqual(EPISODE_AVATAR.episode);

    expect(response.data.seriesIMDbID).toEqual(EPISODE_AVATAR.seriesIMDbID);

    // subsequent calls should return MongoDB result rather than calling external apis
    response = await axios.get(url);
    expect(response.data.title).toEqual(EPISODE_AVATAR.episodeTitle);
    expect(response.data.type).toEqual('episode');
    expect(response.data.episode).toEqual(EPISODE_AVATAR.episode);
    expect(response.data.seriesIMDbID).toEqual(EPISODE_AVATAR.seriesIMDbID);
  });

  describe('Failures', () => {
    test('should find a failed lookup - episode', async() => {
      expect(await FailedLookupsModel.countDocuments()).toEqual(0);
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=999&episode=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
      expect(await FailedLookupsModel.countDocuments()).toEqual(1);

      try {
        await axios.get(`${appUrl}/api/media/video/v2?title=${EPISODE_LOST.seriesTitle}&season=999&episode=999`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 404');
    });
  });

  describe('Validation', () => {
    test('should require title or imdbID param', async() => {
      let error;
      try {
        await axios.get(`${appUrl}/api/media/video/v2`);
      } catch (e) {
        error = e;
      }
      expect(error.message).toEqual('Request failed with status code 422');
    });
  });
});
