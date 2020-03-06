import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { ValidationError } from '../helpers/customErrors';

const DOCUMENT_EXPIRY_IN_SECONDS = 2592000; // 30 days

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

const isRequiredFieldForTVEpisodesIncluded = (fieldToValidate: string): boolean => {
  if (this.type === 'episode') {
    if (fieldToValidate) {
      return true;
    } else {
      throw new ValidationError(fieldToValidate + ' must not be empty for TV episodes');
    }
  }
  return true;
};

const isRequiredFieldForMovieIncluded = (fieldToValidate: string): boolean => {
  if (this.type === 'movie') {
    if (fieldToValidate) {
      return true;
    } else {
      throw new ValidationError(fieldToValidate + ' must not be empty for movies');
    }
  }
  return true;
};

const MediaMetadataSchema: Schema = new Schema({
  actors: { type: Array, required: true },
  createdAt: {
    type: Date,
    expires: DOCUMENT_EXPIRY_IN_SECONDS,
    default: Date.now,
  },
  director: { type: String, required: true },
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
  subcount: { type: String },
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
  year: {
    type: String,
    validate: { validator: isRequiredFieldForMovieIncluded },
  },
}, {
  collection: 'media_metadata',
  timestamps: true,
  versionKey: false,
});

const MediaMetadata = mongoose.model<MediaMetadataInterface>('MediaMetadata', MediaMetadataSchema);
export default MediaMetadata;
