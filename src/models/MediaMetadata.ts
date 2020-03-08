import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { ValidationError } from '../helpers/customErrors';

const DOCUMENT_EXPIRY_IN_SECONDS = 2592000; // 30 days

mongoose.set('useCreateIndex', true);

export interface MediaMetadataInterface extends Document {
  actors: Array<string>;
  directors: Array<string>;
  episodeNumber?: string;
  episodeTitle?: string;
  genres: Array<string>;
  goofs?: string;
  imdbID: string;
  osdbHash: string;
  seasonNumber?: string;
  tagline?: string;
  title: string;
  trivia?: string;
  type: string;
  year: string;

  // Added automatically:
  createdAt: string;
  updatedAt: string;
}

const isRequiredFieldForTVEpisodesIncluded = (fieldToValidate: string): boolean => {
  if (this.type !== 'episode' || fieldToValidate) {
    return true;
  }
  throw new ValidationError(fieldToValidate + ' must not be empty for TV episodes');
};

const MediaMetadataSchema: Schema = new Schema({
  actors: { type: Array, required: true },
  createdAt: {
    type: Date,
    expires: DOCUMENT_EXPIRY_IN_SECONDS,
    default: Date.now,
  },
  directors: { type: Array, required: true },
  episodeNumber: {
    type: String,
    validate: { validator: isRequiredFieldForTVEpisodesIncluded },
  },
  episodeTitle: {
    type: String,
    validate: { validator: isRequiredFieldForTVEpisodesIncluded },
  },
  genres: { type: Array, required: true },
  goofs: { type: String },
  imdbID: { type: String, required: true },
  title: { type: String, required: true },
  osdbHash: {
    type: String,
    index: true,
    validate: {
      validator: (hash: string): boolean => {
        if (hash.length !== 16) {
          throw new ValidationError('Invalid osdb hash length.');
        }
        return true;
      },
    },
  },
  seasonNumber: {
    type: String,
    validate: { validator: isRequiredFieldForTVEpisodesIncluded },
  },
  tagline: { type: String },
  trivia: { type: String },
  type: { type: String, required: true },
  year: { type: String, required: true },
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
