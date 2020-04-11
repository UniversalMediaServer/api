import * as mongoose from 'mongoose';
import { Schema, Document, Model } from 'mongoose';

const DOCUMENT_EXPIRY_IN_SECONDS = 2592000; // 30 days

type ratingSource = 'Metacritic' | 'Rotten Tomatoes' | 'Metacritic';

export interface SeriesMetadataInterface extends Document {
  actors: Array<string>;
  awards?: string;
  country?: string;
  directors: Array<string>;
  genres: Array<string>;
  imdbID: string;
  metascore?: string;
  poster?: string;
  rated?: string; // e.g 'PG-13'
  rating?: number; // e.g. 6.7
  ratings?: Array<{Source: ratingSource; Value: string}>;
  startYear?: string;
  endYear?: string;
  title: string;
  totalSeasons?: number;
  votes?: string;
  year: string;

  // Added automatically:
  createdAt: string;
  updatedAt: string;
}

export interface SeriesMetadataModel extends Model<SeriesMetadataInterface> {
  getByDirOrFilename(dirOrFilename: string): Promise<SeriesMetadataInterface>; 
}

const SeriesMetadataSchema: Schema = new Schema({
  actors: { type: Array, required: true },
  awards: { type: String },
  country: { type: String },
  createdAt: {
    type: Date,
    expires: DOCUMENT_EXPIRY_IN_SECONDS,
    default: Date.now,
  },
  directors: { type: Array, required: true },
  genres: { type: Array, required: true },
  imdbID: { type: String, required: true },
  metascore: { type: String },
  plot: { type: String },
  poster: { type: String },
  rated: { type: String },
  rating: { type: Number },
  ratings: { type: Array, required: true },
  startYear: { type: String },
  endYear: { type: String },
  title: { type: String, required: true },
  totalSeasons: { type: Number },
  votes: { type: String },
  year: { type: String },
}, {
  collection: 'series_metadata',
  timestamps: true,
  versionKey: false,
});

SeriesMetadataSchema.virtual('imdburl').get(function() {
  return `https://www.imdb.com/title/${this.imdbID}`;
});

// this allows us to use MongoDB Full text search https://docs.mongodb.com/manual/reference/operator/query/text/#op._S_text
SeriesMetadataSchema.index({ 'title': 'text' });

const SeriesMetadata = mongoose.model<SeriesMetadataInterface, SeriesMetadataModel>('SeriesMetadata', SeriesMetadataSchema);
export default SeriesMetadata;
