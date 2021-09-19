import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

const THREE_DAYS_IN_SECONDS = 259200;

export interface TMDBConfigurationInterface {
  imageBaseURL: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TMDBConfigurationModel extends mongoose.Model<TMDBConfigurationInterface> {}

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

const TMDBConfiguration = mongoose.model<TMDBConfigurationInterface, TMDBConfigurationModel>('TMDBConfiguration', TMDBConfigurationSchema);
export default TMDBConfiguration;
