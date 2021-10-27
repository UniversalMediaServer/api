import * as mongoose from 'mongoose';
import { Schema, Model } from 'mongoose';
import { CreditsResponse, TvSeasonImagesResponse, TvSeasonExternalIdsResponse } from 'moviedb-promise/dist/request-types';

export interface SeasonMetadataInterface {
  airDate?: string;
  credits?: CreditsResponse;
  externalIDs?: TvSeasonExternalIdsResponse;
  images?: TvSeasonImagesResponse;
  name?: string;
  overview?: string;
  seasonNumber: number;
  tmdbID?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SeasonMetadataModel extends Model<SeasonMetadataInterface> {}

const SeasonMetadataSchema: Schema = new Schema({
  airDate: { type: String },
  credits: { type: Array },
  externalIDs: { type: Array },
  images: { type: Array },
  name: { type: String },
  overview: { type: String },
  seasonNumber: { type: Number },
  tmdbID: { type: String },
}, {
  collection: 'season_metadata',
  timestamps: true,
  versionKey: false,
});

SeasonMetadataSchema.virtual('imdburl').get(function() {
  return `https://www.imdb.com/title/${this.imdbID}`;
});

// this allows us to use MongoDB Full text search https://docs.mongodb.com/manual/reference/operator/query/text/#op._S_text
SeasonMetadataSchema.index({ 'title': 'text' });

const SeasonMetadata = mongoose.model<SeasonMetadataInterface, SeasonMetadataModel>('SeasonMetadata', SeasonMetadataSchema);

SeasonMetadata.on('index', function(err) {
  if (err) {
    console.error('SeasonMetadata index error: %s', err);
  } else {
    console.info('SeasonMetadata indexing complete');
  }
});

export default SeasonMetadata;
