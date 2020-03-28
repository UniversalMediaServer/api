import * as _ from 'lodash';
import EpisodeProcessing from '../models/EpisodeProcessing';
import imdbAPI from '../services/imdb-api';
import MediaMetadata from '../models/MediaMetadata';
import { mapper } from '../utils/data-mapper';
import connect from '../models/connection';

const db: string = process.env.MONGO_URL;
connect(db);

const processEpisodes = async(): Promise<void> => {
  const seriesIdsToProcess = await EpisodeProcessing.find({})
    .select({ seriesimdbid: 1, _id: 0 })
    .limit(5000)
    .lean();

  const allImdbIds = _.map(_.values(seriesIdsToProcess), 'seriesimdbid');
  for (const seriesId of allImdbIds) {
    const tvSeriesInfo = await imdbAPI.get({ id: seriesId });
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

processEpisodes()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(0);
  });
