import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { CreditsResponse, EpisodeCreditsResponse, EpisodeExternalIdsResponse, EpisodeImagesResponse, MovieExternalIdsResponse, MovieImagesResponse } from 'moviedb-promise/dist/request-types';
import { ProductionCompany, ProductionCountry, SpokenLanguage } from 'moviedb-promise/dist/types';

export interface MediaMetadataInterface {
  actors?: Array<string>;
  awards?: string;
  boxoffice?: string;
  budget?: number;
  collectionTmdbID?: number;
  country?: string;
  credits?: CreditsResponse | EpisodeCreditsResponse;
  directors?: Array<string>;
  episode?: string;
  externalIDs?: MovieExternalIdsResponse | EpisodeExternalIdsResponse;
  genres?: Array<string>;
  goofs?: string;
  homepage?: string;
  images?: MovieImagesResponse | EpisodeImagesResponse;
  imdbID?: string;
  metascore?: string;
  originalLanguage?: string;
  originalTitle?: string;
  plot?: string;
  poster?: string;
  posterRelativePath?: string;
  production?: string;
  productionCompanies?: Array<ProductionCompany>;
  productionCountries?: Array<ProductionCountry>;
  rated?: string; // e.g 'PG-13'
  rating?: number; // e.g. 6.7
  released?: Date;
  revenue?: string;
  runtime?: string;
  searchMatches?: Array<string>;
  season?: string;
  seriesIMDbID?: string;
  spokenLanguages?: Array<SpokenLanguage>;
  tagline?: string;
  title: string;
  tmdbID?: number;
  tmdbTvID?: number;
  trivia?: string;
  type: string;
  votes?: string;
  year?: string;
}

const isTypeEpisode = function(context?: MediaMetadataInterface): boolean {
  return context ? context.type === 'episode' : this.type === 'episode';
};

const MediaMetadataSchema: Schema = new Schema({
  actors: { type: Array },
  awards: { type: String },
  boxoffice: { type: String },
  budget: { type: Number },
  collectionTmdbID: { type: Number },
  country: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
    select: false,
  },
  credits: { type: Array },
  directors: { type: Array },
  episode: {
    index: true,
    required: isTypeEpisode,
    type: String,
  },
  externalIDs: { type: Array },
  genres: { type: Array },
  goofs: { type: String },
  homepage: { type: String },
  images: { type: Array },
  imdbID: { type: String, index: true },
  metascore: { type: String },
  originalLanguage: { type: String },
  originalTitle: { type: String },
  productionCompanies: { type: Array },
  productionCountries: { type: Array },
  plot: { type: String },
  poster: { type: String },
  posterRelativePath: { type: String },
  production: { type: String },
  rated: { type: String },
  rating: { type: Number },
  released: { type: Date },
  revenue: { type: String },
  runtime: { type: String },
  searchMatches: { type: Array, index: true, select: false },
  season: {
    index: true,
    required: isTypeEpisode,
    type: String,
  },
  seriesIMDbID: { type: String },
  tagline: { type: String },
  title: { type: String, index: true, required: function(): boolean { return !isTypeEpisode(this); } },
  tmdbID: { type: Number },
  tmdbTvID: { type: Number },
  trivia: { type: String },
  type: { type: String, required: true },
  votes: { type: String },
  year: { index: true, type: String },
}, {
  collection: 'media_metadata',
  timestamps: true,
  versionKey: false,
});

MediaMetadataSchema.index({ episode: 1, season: 1, searchMatches: 1 });
MediaMetadataSchema.index({ episode: 1, season: 1, searchMatches: 1, year: 1 });
MediaMetadataSchema.index({ searchMatches: 1, year: 1 });

MediaMetadataSchema.pre<MediaMetadataInterface>('save', function(next) {
  if (this.title && this.title.startsWith('Episode #')) {
    this.title = undefined;
  }
  next();
});

MediaMetadataSchema.virtual('imdburl').get(function() {
  return `https://www.imdb.com/title/${this.imdbID}`;
});

const MediaMetadata = mongoose.model<MediaMetadataInterface>('MediaMetadata', MediaMetadataSchema);

MediaMetadata.on('index', function(err) {
  if (err) {
    console.error('MediaMetadata index error: %s', err);
  } else {
    console.info('MediaMetadata indexing complete');
  }
});

export default MediaMetadata;
