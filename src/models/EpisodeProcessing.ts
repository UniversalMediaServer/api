import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

mongoose.set('useCreateIndex', true);

export interface EpisodeProcessingInterface extends Document {
  episode?: number;
  imdbid: string;
  season?: number;
  title?: string;

  // Added automatically:
  createdAt: string;
  updatedAt: string;
}

const EpisodeProcessingSchema: Schema = new Schema({
  episode: { type: Number },
  imdbid: { type: String, required: true },
  season: { type: Number },
  title: { type: String },
}, {
  collection: 'episode_processing',
  timestamps: true,
});

const EpisodeProcessing = mongoose.model<EpisodeProcessingInterface>('EpisodeProcessing', EpisodeProcessingSchema);
export default EpisodeProcessing;
