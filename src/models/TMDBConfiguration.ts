import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

const THREE_DAYS_IN_SECONDS = 259200;

export interface TMDBConfigurationInterface {
  imageBaseURL: string;
}

export interface TMDBConfigurationInterfaceDocument extends Document, TMDBConfigurationInterface {}

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

const TMDBConfiguration = mongoose.model<TMDBConfigurationInterfaceDocument>('TMDBConfiguration', TMDBConfigurationSchema);
export default TMDBConfiguration;
