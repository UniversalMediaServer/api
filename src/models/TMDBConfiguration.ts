import mongoose, { InferSchemaType, Schema } from 'mongoose';

const THREE_DAYS_IN_SECONDS = 259200;

const TMDBConfigurationSchema: Schema = new Schema({
  imageBaseURL: { type: String, required: true },
  createdAt: {
    default: Date.now,
    expires: THREE_DAYS_IN_SECONDS,
    type: Date,
  },
}, {
  collection: 'tmdb_configuration',
  timestamps: true,
  versionKey: false,
});

export type TMDBConfigurationInterface = InferSchemaType<typeof TMDBConfigurationSchema>;

const TMDBConfiguration = mongoose.model('TMDBConfiguration', TMDBConfigurationSchema);

export default TMDBConfiguration;
