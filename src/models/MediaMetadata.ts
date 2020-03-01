import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

mongoose.set('useCreateIndex', true);

export interface MediaMetadataInterface extends Document {
  subcount?: string;
  title?: string;
  director?: string;
  imdbID?: string;
  osdbHash: string;
  genres?: Array<string>;
  actors?: Array<string>;
  episodeTitle?: string;
  seasonNumber?: string;
  episodeNumber?: string;
  year?: string;
  type?: string;
  goofs?: string;
  trivia?: string;
  tagline?: string;

  // Added automatically:
  createdAt: string;
  updatedAt: string;
}

const MediaMetadataSchema: Schema = new Schema({
  title: { type: String, required: true },
  subcount: { type: String },
  director: { type: String },
  imdbID: { type: String },
  osdbHash: {
    type: String,
    index: true,
    validate: {
      validator: function(v): boolean {
        return v.length === 16;
      },
      msg: 'Invalid osdb hash length.',
    },
  },
  genres: { type: Array },
  actors: { type: Array },
  episodeTitle: { type: String },
  seasonNumber: { type: String },
  episodeNumber: { type: String },
  year: { type: String },
  type: { type: String },
  goofs: { type: String },
  trivia: { type: String },
  tagline: { type: String },
}, {
  collection: 'media_metadata',
  timestamps: true,
  versionKey: false,
});

MediaMetadataSchema.pre<MediaMetadataInterface>('save', function(next) {
  if (this.episodeTitle && this.episodeTitle.startsWith('Episode #')) {
    this.episodeTitle = undefined;
  }
  next();
});

const MediaMetadata = mongoose.model<MediaMetadataInterface>('MediaMetadata', MediaMetadataSchema);
export default MediaMetadata;
