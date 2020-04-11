import * as _ from 'lodash';
import EpisodeProcessing from '../models/EpisodeProcessing';
import imdbAPI from '../services/imdb-api';
import MediaMetadata from '../models/MediaMetadata';
import SeriesMetadata from '../models/SeriesMetadata';
import { mapper } from '../utils/data-mapper';
import connect from '../models/connection';

const db: string = process.env.MONGO_URL;
const NUM_SERIES_TO_PROCESS = 1000;
connect(db);

export const processEpisodes = async(): Promise<void> => {
  const seriesIdsToProcess = await EpisodeProcessing.find({})
    .select({ seriesimdbid: 1, _id: 0 })
    .limit(NUM_SERIES_TO_PROCESS)
    .lean();

  const allImdbIds = _.map(_.values(seriesIdsToProcess), 'seriesimdbid');
  for (const seriesId of allImdbIds) {
    const tvSeriesInfo = await imdbAPI.get({ id: seriesId });
    const metadata = mapper.parseIMDBAPISeriesResponse(tvSeriesInfo);
    await SeriesMetadata.create(metadata);
    // @ts-ignore
    const allEpisodes = await tvSeriesInfo.episodes();
    const metadataDocuments = [];
    for (const episode of allEpisodes) {
      if (episode.imdbid) {
        const episodeImdbData = await imdbAPI.get({ id: episode.imdbid });
        const episodeMetadata = mapper.parseIMDBAPIEpisodeResponse(episodeImdbData);
        episodeMetadata.imdbID = episode.imdbid;
        episodeMetadata.title = tvSeriesInfo.title;
        const validationError = new MediaMetadata(episodeMetadata).validateSync();
        if (!validationError) {
          metadataDocuments.push(episodeMetadata);
        }
      }
    }
    await MediaMetadata.insertMany(metadataDocuments);
    await EpisodeProcessing.deleteOne({ seriesimdbid: seriesId });
  }
};

if (require.main === module) {
  processEpisodes()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(0);
    });
}
