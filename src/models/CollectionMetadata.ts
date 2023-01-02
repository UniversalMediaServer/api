import mongoose, { Schema, InferSchemaType } from 'mongoose';

const CollectionMetadataSchema: Schema = new Schema({
  images: { type: Array },
  name: { type: String },
  overview: { type: String },
  movieTmdbIds: { type: Array<number> },
  posterRelativePath: { type: String },
  tmdbID: { type: Number, index: true, required: true },
}, {
  collection: 'collection_metadata',
  timestamps: true,
  versionKey: false,
});

export type CollectionMetadataInterface = InferSchemaType<typeof CollectionMetadataSchema>;

const CollectionMetadata = mongoose.model('CollectionMetadata', CollectionMetadataSchema);

CollectionMetadata.on('index', function(err) {
  if (err) {
    console.error('CollectionMetadata index error: %s', err);
  } else {
    console.info('CollectionMetadata indexing complete');
  }
});

export default CollectionMetadata;
