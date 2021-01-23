import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

export interface EpisodeProcessingInterface extends Document {
  seriesimdbid: string;
}

const opts = {
  collection: 'episode_processing',
  timestamps: true,
};

const EpisodeProcessingSchema: Schema = new Schema({ seriesimdbid: { required: true, type: String, unique: true } }, opts);

const EpisodeProcessing = mongoose.model<EpisodeProcessingInterface>('EpisodeProcessing', EpisodeProcessingSchema);
export default EpisodeProcessing;
