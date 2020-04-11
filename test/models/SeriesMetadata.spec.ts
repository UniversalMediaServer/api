import * as  mongoose from 'mongoose';
import * as _ from 'lodash';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SeriesMetadataModel from '../../src/models/SeriesMetadata';

const seriesMetaData = {
  'genres': [
    'Action',
    'Crime',
    'Drama',
    'Mystery',
    'Thriller',
  ],
  'ratings': [
    {
      'Source': 'Internet Movie Database',
      'Value': '8.3/10',
    },
  ],
  'imdbID': 'tt0455275',
  'title': 'Prison Break',
  'totalSeasons': 5,
};

const mongod = new MongoMemoryServer();

let document;

describe('Series Metadata Model', () => {
  beforeAll(async() => {
    const mongoUrl = await mongod.getConnectionString();
    process.env.MONGO_URL = mongoUrl;
    await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
  });

  beforeEach(async() => {
    await SeriesMetadataModel.deleteMany({});
    document = await SeriesMetadataModel.create(seriesMetaData);
  });

  afterAll(async() => {
    await mongoose.connection.dropDatabase();
  });

  describe('findSimilarSeries', () => {
    it('should return expected document for similar search terms', async() => {
      let result = await SeriesMetadataModel.findSimilarSeries('Prison Break S2');
      expect(result._id).toEqual(document._id);

      result = await SeriesMetadataModel.findSimilarSeries('Prison Break season 1');
      expect(result._id).toEqual(document._id);

      result = await SeriesMetadataModel.findSimilarSeries('Prison Break season2');
      expect(result._id).toEqual(document._id);

      result = await SeriesMetadataModel.findSimilarSeries('PriSon Break All BluRay h264');
      expect(result._id).toEqual(document._id);
    });

    it('should not return doucment for arbitrary search terms', async() => {
      let result = await SeriesMetadataModel.findSimilarSeries('Homeland');
      expect(result).toEqual(null);

      result = await SeriesMetadataModel.findSimilarSeries('Worlds Toughest Prisons');
      expect(result).toEqual(null);

      result = await SeriesMetadataModel.findSimilarSeries('The Simpsons');
      expect(result).toEqual(null);
    });
  });
});
