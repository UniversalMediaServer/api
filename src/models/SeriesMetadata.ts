import * as mongoose from 'mongoose';
import { Schema, Model } from 'mongoose';
import { Network, SimplePerson, SimpleSeason, TvImagesResponse, TvExternalIdsResponse, CreditsResponse } from 'moviedb-promise/dist/request-types';
import { ProductionCompany, ProductionCountry, SpokenLanguage } from 'moviedb-promise/dist/types';

export interface SeriesMetadataInterface {
  actors?: Array<string>;
  awards?: string;
  country?: string;
  createdBy?: Array<SimplePerson>;
  credits?: CreditsResponse;
  directors?: Array<string>;
  endYear?: string;
  externalIDs?: TvExternalIdsResponse;
  genres: Array<string>;
  homepage?: string;
  images?: TvImagesResponse;
  imdbID?: string;
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
  searchMatches?: Array<string>;
  seasons?: Array<SimpleSeason>;
  seriesType?: string;
  spokenLanguages?: Array<SpokenLanguage>;
  startYear?: string;
  status?: string;
  tagline?: string;
  title: string;
  type: string;
  tmdbID?: number;
  totalSeasons?: number;
  votes?: string;
  year: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
  imdbID: { type: String, index: true },
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
  searchMatches: { type: Array, index: true, select: false },
  seasons: { type: Array },
  seriesType: { type: String },
  spokenLanguages: { type: Array },
  startYear: { type: String, index: true },
  status: { type: String },
  tagline: { type: String },
  title: { type: String, index: true, required: true },
  tmdbID: { type: Number, index: true },
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

SeriesMetadata.on('index', function(err) {
  if (err) {
    console.error('SeriesMetadata index error: %s', err);
  } else {
    console.info('SeriesMetadata indexing complete');
  }
});

export default SeriesMetadata;
