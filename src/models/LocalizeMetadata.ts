import mongoose, { Schema, InferSchemaType } from 'mongoose';

const LocalizeMetadataSchema = new Schema({
  episodeNumber: { index: true, type: Number },
  homepage: { type: String },
  imdbID: { index: true, type: String },
  language: { required: true, type: String },
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

LocalizeMetadataSchema.index({ language: 1, mediaType: 1, tmdbID: 1, seasonNumber: 1, episodeNumber: 1 })

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