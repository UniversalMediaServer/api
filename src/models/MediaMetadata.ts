import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { ValidationError } from '../helpers/customErrors';

const DOCUMENT_EXPIRY_IN_SECONDS = 2592000; // 30 days

type ratingSource = 'Metacritic' | 'Rotten Tomatoes' | 'Metacritic';

export interface MediaMetadataInterface extends Document {
  actors: Array<string>;
  awards?: string;
  boxoffice?: string;
  country?: string;
  directors: Array<string>;
  episodeNumber?: string;
  episodeTitle?: string;
  genres: Array<string>;
  goofs?: string;
  imdbID: string;
  metascore?: string;
  osdbHash?: string;
  production?: string;
  poster?: string;
  rated?: string; // e.g 'PG-13'
  rating?: number; // e.g. 6.7
  ratings?: Array<{Source: ratingSource; Value: string}>; // e.g. {"Source": "Metacritic", "Value": "67/100"}
  released?: Date;
  runtime?: string;
  seasonNumber?: string;
  tagline?: string;
  title: string;
  trivia?: string;
  type: string;
  votes?: string;
  year: string;

  // Added automatically:
  createdAt: string;
  updatedAt: string;
}

const isTypeEpisode = function(): boolean {
  return this.type === 'episode';
};

const MediaMetadataSchema: Schema = new Schema({
  actors: { type: Array, required: true },
  awards: { type: String },
  boxoffice: { type: String },
  country: { type: String },
  createdAt: {
    type: Date,
    expires: DOCUMENT_EXPIRY_IN_SECONDS,
    default: Date.now,
  },
  directors: { type: Array, required: true },
  episodeNumber: {
    required: isTypeEpisode,
    type: String,
  },
  episodeTitle: {
    required: isTypeEpisode,
    type: String,
  },
  genres: { type: Array, required: true },
  goofs: { type: String },
  imdbID: { type: String, required: true },
  osdbHash: {
    index: true,
    type: String,
    validate: {
      validator: (hash: string): boolean => {
        if (hash.length !== 16) {
          throw new ValidationError('Invalid osdb hash length.');
        }
        return true;
      },
    },
  },
  metascore: { type: String },
  production: { type: String },
  poster: { type: String },
  rated: { type: String },
  rating: { type: Number },
  ratings: { type: Array, required: true },
  released: { type: Date },
  runtime: { type: String },
  seasonNumber: {
    required: isTypeEpisode,
    type: String,
  },
  tagline: { type: String },
  title: { type: String, required: true, index: true },
  trivia: { type: String },
  type: { type: String, required: true },
  votes: { type: String },
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

MediaMetadataSchema.virtual('imdburl').get(function() {
  return `https://www.imdb.com/title/${this.imdbID}`;
});

const MediaMetadata = mongoose.model<MediaMetadataInterface>('MediaMetadata', MediaMetadataSchema);
export default MediaMetadata;
