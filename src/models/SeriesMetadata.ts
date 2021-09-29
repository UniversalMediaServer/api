import * as mongoose from 'mongoose';
import { Schema, Document, Model } from 'mongoose';
import { Network, SimplePerson, SimpleSeason, TvImagesResponse, TvExternalIdsResponse, CreditsResponse } from 'moviedb-promise/dist/request-types';
import { ProductionCompany, ProductionCountry, SpokenLanguage } from 'moviedb-promise/dist/types';

export interface SeriesMetadataInterface extends Document {
  actors: Array<string>;
  awards?: string;
  country?: string;
  createdBy?: Array<SimplePerson>;
  credits?: CreditsResponse;
  directors: Array<string>;
  endYear?: string;
  externalIDs?: TvExternalIdsResponse;
  genres: Array<string>;
  homepage?: string;
  images?: TvImagesResponse;
  imdbID: string;
  inProduction?: boolean;
  languages?: Array<string>;
  lastAirDate?: string;
  metascore?: string;
  networks?: Array<Network>;
  numberOfEpisodes?: number;
  originCountry?: Array<string>;
  originalLanguage?: string;
  originalTitle?: string;
  plot?: string;
  poster?: string;
  posterRelativePath?: string;
  productionCompanies?: Array<ProductionCompany>;
  productionCountries?: Array<ProductionCountry>;
  rated?: string; // e.g 'PG-13'
  rating?: number; // e.g. 6.7
  ratings?: Array<{Source: string; Value: string}>;
  released?: Date;
  seasons?: Array<SimpleSeason>;
  seriesType?: string;
  spokenLanguages?: Array<SpokenLanguage>;
  startYear?: string;
  status?: string;
  tagline?: string;
  title: string;
  type: string;
  tmdbID?: string;
  totalSeasons?: number;
  votes?: string;
  year: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SeriesMetadataModel extends Model<SeriesMetadataInterface> {
}

const SeriesMetadataSchema: Schema = new Schema({
  actors: { type: Array },
  awards: { type: String },
  country: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: { type: Array },
  credits: { type: Array },
  directors: { type: Array },
  endYear: { type: String },
  externalIDs: { type: Array },
  genres: { type: Array },
  homepage: { type: String },
  images: { type: Array },
  imdbID: { type: String, required: true, index: true },
  inProduction: { type: Boolean },
  languages: { type: Array },
  lastAirDate: { type: String },
  metascore: { type: String },
  networks: { type: Array },
  numberOfEpisodes: { type: Number },
  originCountry: { type: Array },
  originalLanguage: { type: String },
  originalTitle: { type: String },
  plot: { type: String },
  poster: { type: String },
  posterRelativePath: { type: String },
  productionCompanies: { type: Array },
  productionCountries: { type: Array },
  rated: { type: String },
  rating: { type: Number },
  ratings: { type: [new mongoose.Schema({ 'Source': String, 'Value': String })] },
  released: { type: Date },
  seasons: { type: Array },
  seriesType: { type: String },
  spokenLanguages: { type: Array },
  startYear: { type: String },
  status: { type: String },
  tagline: { type: String },
  title: { type: String, required: true },
  tmdbID: { type: String },
  totalSeasons: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    validate: {
      validator: (t: string): boolean =>  t === 'series',
      required: [true, 'Series Metadata must have a type, of "series".'],
    },
  },
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

const SeriesMetadata = mongoose.model<SeriesMetadataInterface, SeriesMetadataModel>('SeriesMetadata', SeriesMetadataSchema);
export default SeriesMetadata;
