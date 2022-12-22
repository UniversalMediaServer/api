import * as mongoose from 'mongoose';
import { Schema, Model } from 'mongoose';

export interface LocalizeMetadataInterface {
  episodeNumber?: number;
  homepage?: string;
  imdbID?: string;
  language: string;
  mediaType: string;
  overview?: string;
  posterRelativePath?: string;
  seasonNumber?: number;
  tagline?: string;
  title?: string;
  tmdbID?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LocalizeMetadataModel extends Model<LocalizeMetadataInterface> {}

const LocalizeMetadataSchema: Schema = new Schema({
  episodeNumber: { index: true, type: Number },
  homepage: { type: String },
  imdbID: { index: true, type: String },
  language: { required: true, index: true, type: String },
  mediaType: { required: true, index: true, type: String },
  overview: { type: String },
  posterRelativePath: { type: String },
  seasonNumber: { index: true, type: Number },
  tagline: { type: String },
  title: { type: String },
  tmdbID: { index: true, type: Number },
}, {
  collection: 'localize_metadata',
  timestamps: true,
  versionKey: false,
});

const LocalizeMetadata = mongoose.model<LocalizeMetadataInterface, LocalizeMetadataModel>('LocalizeMetadata', LocalizeMetadataSchema);

LocalizeMetadata.on('index', function(err) {
  if (err) {
    console.error('LocalizeMetadata index error: %s', err);
  } else {
    console.info('LocalizeMetadata indexing complete');
  }
});

export default LocalizeMetadata;