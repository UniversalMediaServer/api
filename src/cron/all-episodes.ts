import * as _ from 'lodash';
import EpisodeProcessing from '../models/EpisodeProcessing';
import imdbAPI from '../services/imdb-api';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { mapper } from '../utils/data-mapper';
import connect from '../models/connection';
import { setSeriesMetadataByIMDbID } from '../controllers/media';
import { TVShow } from 'imdb-api';
import FailedLookups from '../models/FailedLookups';

const db: string = process.env.MONGO_URL;
const NUM_SERIES_TO_PROCESS = 1000;
connect(db);

/**
 * Processes all episodes for a TV series.
 */
export const processEpisodes = async(): Promise<void> => {
  const seriesIdsToProcess = await EpisodeProcessing.find({})
    .select({ seriesimdbid: 1, _id: 0 })
    .limit(NUM_SERIES_TO_PROCESS)
    .lean();

  const allImdbIds = _.map(_.values(seriesIdsToProcess), 'seriesimdbid');
  for (const seriesId of allImdbIds) {
    await setSeriesMetadataByIMDbID(seriesId);

    // This extra lookup gives access to the episodes function
    const tvSeriesInfo = await imdbAPI.get({ id: seriesId }) as TVShow;

    const allEpisodes = await tvSeriesInfo.episodes();
    const metadataDocuments = [];
    for (const episode of allEpisodes) {
      if (episode.imdbid) {
        // If we already have a result, continue
        const existingResult: MediaMetadataInterface = await MediaMetadata.findOne({ imdbid: episode.imdbid }, null, { lean: true }).exec();
        if (existingResult) {
          continue;
        }

        // If we already failed to get a result, continue
        if (await FailedLookups.findOne({ imdbid: episode.imdbid }, '_id', { lean: true }).exec()) {
          continue;
        }

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
