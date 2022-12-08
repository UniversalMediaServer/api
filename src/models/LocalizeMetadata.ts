import * as mongoose from 'mongoose';
import { Schema, Model } from 'mongoose';

export interface LocalizeMetadataInterface {
  imdbID: string;
  language: string;
  plot?: string;
  posterRelativePath?: string;
  tagline?: string;
  title?: string;
  tmdbID?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LocalizeMetadataModel extends Model<LocalizeMetadataInterface> {}

const LocalizeMetadataSchema: Schema = new Schema({
  imdbID: { index: true, type: String },
  language: { index: true, type: String },
  plot: { type: String },
  posterRelativePath: { type: String },
  tagline: { type: String },
  title: { type: String },
  tmdbID: { type: String },
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
