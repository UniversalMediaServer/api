import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

mongoose.set('useCreateIndex', true);

export interface MediaMetadataInterface extends Document {
  title: string;
  director?: string;
  imdbID?: string;
  osdbHash: string;
  genres?: Array<string>;
  actors?: Array<string>;
  episodeTitle?: string; 
  seasonNumber?: string;
  episodeNumber?: string;
  year?: string;
}

const MediaMetadataSchema: Schema = new Schema({
  title: { type: String, required: true },
  director: { type: String },
  imdbID: { type: String},
  osdbHash: { 
    type: String,
    index: true,
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 16;
      },
      msg: 'Invalid osdb hash length.',
    }
  },
  genres: [String],
  actors: [String],
  episodeTitle: { type: String },
  seasonNumber: { type: String },
  episodeNumber: { type: String },
  year: { type: String },
}, { collection: 'media_metadata' });

const MediaMetadata = mongoose.model<MediaMetadataInterface>('MediaMetadata', MediaMetadataSchema);
export default MediaMetadata;
