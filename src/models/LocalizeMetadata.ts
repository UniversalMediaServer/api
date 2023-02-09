import mongoose, { Schema, InferSchemaType } from 'mongoose';

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

export type LocalizeMetadataInterface = InferSchemaType<typeof LocalizeMetadataSchema>;

const LocalizeMetadata = mongoose.model('LocalizeMetadata', LocalizeMetadataSchema);

LocalizeMetadata.on('index', function(err) {
  if (err) {
    console.error('LocalizeMetadata index error: %s', err);
  } else {
    console.info('LocalizeMetadata indexing complete');
  }
});

export default LocalizeMetadata;