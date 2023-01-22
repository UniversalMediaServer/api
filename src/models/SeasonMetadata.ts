import mongoose, { Schema, InferSchemaType } from 'mongoose';

const castSubdocument = new Schema({
  adult: { type: Boolean },
  cast_id: { type: Number },
  character: { type: String },
  credit_id: { type: String },
  gender: { type: Number },
  id: { type: Number },
  known_for_department: { type: String },
  name: { type: String },
  order: { type: Number },
  original_name: { type: String },
  popularity: { type: Number },
  profile_path: { type: String },
});

const crewSubdocument = new Schema({
  adult: { type: Boolean },
  credit_id: { type: String },
  department: { type: String },
  gender: { type: Number },
  id: { type: Number },
  known_for_department: { type: String },
  job: { type: String },
  name: { type: String },
  original_name: { type: String },
  popularity: { type: Number },
  profile_path: { type: String },
});

const creditsSubdocument = new Schema({ 
  id: Number,
  cast: [castSubdocument],
  crew: [crewSubdocument],
});
const externalIdsSubdocument = new Schema({
  id: { type: Number },
  freebase_mid: { type: String },
  freebase_id: { type: String },
  tvdb_id: { type: Number },
  tvrage_id: { type: Number },
});
const posterSubdocument = new Schema({
  aspect_ratio: { type: Number },
  file_path: { type: String },
  height: { type: Number },
  iso_639_1: { type: String },
  vote_average: { type: Number },
  vote_count: { type: Number },
  width: { type: Number },
});
const imagesSubdocument = new Schema({
  id: { type: Number },
  posters: [posterSubdocument],
});

const SeasonMetadataSchema: Schema = new Schema({
  airDate: { type: String },
  credits: creditsSubdocument,
  externalIDs: externalIdsSubdocument,
  images: imagesSubdocument,
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
