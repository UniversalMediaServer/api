import { OmdbRating } from 'imdb-api/lib/interfaces';
import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { ValidationError } from '../helpers/customErrors';

export interface MediaMetadataInterface {
  actors: Array<string>;
  awards?: string;
  boxoffice?: string;
  country?: string;
  directors: Array<string>;
  episodeNumber?: string;
  genres: Array<string>;
  goofs?: string;
  imdbID: string;
  metascore?: string;
  osdbHash?: string;
  plot?: string;
  production?: string;
  poster?: string;
  rated?: string; // e.g 'PG-13'
  rating?: number; // e.g. 6.7
  ratings?: Array<OmdbRating>; // e.g. {"Source": "Metacritic", "Value": "67/100"}
  released?: Date;
  runtime?: string;
  searchMatches?: Array<string>;
  seasonNumber?: string;
  seriesIMDbID?: string;
  tagline?: string;
  title: string;
  trivia?: string;
  type: string;
  votes?: string;
  year: string;
}

export interface MediaMetadataInterfaceDocument extends Document, MediaMetadataInterface {}

const isTypeEpisode = function(context?: MediaMetadataInterface): boolean {
  return context ? context.type === 'episode' : this.type === 'episode';
};

const MediaMetadataSchema: Schema = new Schema({
  actors: { type: Array, required: true },
  awards: { type: String },
  boxoffice: { type: String },
  country: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
    select: false,
  },
  directors: { type: Array, required: true },
  episodeNumber: {
    required: isTypeEpisode,
    type: String,
  },
  genres: { type: Array, required: true },
  goofs: { type: String },
  imdbID: { type: String, index: true, required: true, unique: true },
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
  plot: { type: String },
  production: { type: String },
  poster: { type: String },
  rated: { type: String },
  rating: { type: Number },
  ratings: { type: Array, required: true },
  released: { type: Date },
  runtime: { type: String },
  searchMatches: { type: Array, index: true, select: false },
  seasonNumber: {
    required: isTypeEpisode,
    type: String,
  },
  seriesIMDbID: { type: String },
  tagline: { type: String },
  title: { type: String, index: true, required: function(): boolean { return !isTypeEpisode(this); } },
  trivia: { type: String },
  type: { type: String, required: true },
  votes: { type: String },
  year: { type: String, required: true },
}, {
  collection: 'media_metadata',
  timestamps: true,
  versionKey: false,
});

MediaMetadataSchema.pre<MediaMetadataInterfaceDocument>('save', function(next) {
  if (this.title && this.title.startsWith('Episode #')) {
    this.title = undefined;
  }
  next();
});

MediaMetadataSchema.virtual('imdburl').get(function() {
  return `https://www.imdb.com/title/${this.imdbID}`;
});

const MediaMetadata = mongoose.model<MediaMetadataInterfaceDocument>('MediaMetadata', MediaMetadataSchema);
export default MediaMetadata;
