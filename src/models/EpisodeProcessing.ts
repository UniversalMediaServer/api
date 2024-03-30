import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export interface EpisodeProcessingInterface {
  seriesimdbid: string;
}

const opts = {
  collection: 'episode_processing',
  timestamps: true,
};

const EpisodeProcessingSchema = new Schema({ seriesimdbid: { required: true, type: String, unique: true } }, opts);

const EpisodeProcessing = mongoose.model<EpisodeProcessingInterface>('EpisodeProcessing', EpisodeProcessingSchema);
export default EpisodeProcessing;
