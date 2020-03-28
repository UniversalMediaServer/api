import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

export interface EpisodeProcessingInterface extends Document {
  seriesimdbid: string;

  // Added automatically:
  createdAt: string;
  updatedAt: string;
}

const opts = {
  collection: 'episode_processing',
  timestamps: true,
};

const EpisodeProcessingSchema: Schema = new Schema({ seriesimdbid: { type: String, required: true } }, opts);

const EpisodeProcessing = mongoose.model<EpisodeProcessingInterface>('EpisodeProcessing', EpisodeProcessingSchema);
export default EpisodeProcessing;
