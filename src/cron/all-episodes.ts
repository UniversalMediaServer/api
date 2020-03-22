import EpisodeProcessing, from '../models/EpisodeProcessing';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import { getFromIMDbAPI } from '../controllers/media';
import connect from '../models/connection';

const db: string = process.env.MONGO_URL;
connect(db);

const processEpisodes = async() => {
  const episodesToProcess = await EpisodeProcessing.find({}).limit(1500).lean();

  for (const episode of episodesToProcess) {
    const imdbData: MediaMetadataInterface = await getFromIMDbAPI(episode.imdbid);

    // TODO assemble the data we need here
    imdbData.title = episode.title;
    imdbData.season = episode.season;
    imdbData.episode = episode.episode;
    await MediaMetadata.create(imdbData);
    await EpisodeProcessing.deleteOne({ imdbid: episode.imdbid });
  }
};

processEpisodes()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
