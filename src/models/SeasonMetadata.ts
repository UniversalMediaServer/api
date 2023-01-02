import mongoose, { Schema, InferSchemaType } from 'mongoose';

const SeasonMetadataSchema: Schema = new Schema({
  airDate: { type: String },
  credits: { type: Object },
  externalIDs: { type: Object },
  images: { type: Object },
  name: { type: String },
  overview: { type: String },
  posterRelativePath: { type: String },
  seasonNumber: { type: Number, index: true, required: true },
  tmdbID: { type: Number },
  tmdbTvID: { type: Number, index: true, required: true },
}, {
  collection: 'season_metadata',
  timestamps: true,
  versionKey: false,
});

export type SeasonMetadataInterface = InferSchemaType<typeof SeasonMetadataSchema>;

const SeasonMetadata = mongoose.model('SeasonMetadata', SeasonMetadataSchema);

SeasonMetadata.on('index', function(err) {
  if (err) {
    console.error('SeasonMetadata index error: %s', err);
  } else {
    console.info('SeasonMetadata indexing complete');
  }
});

export default SeasonMetadata;
