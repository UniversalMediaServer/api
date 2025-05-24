import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

const THIRTY_DAYS_IN_SECONDS = 2592000; // 30 days

export interface FailedLookupsInterface {
  episode?: string;
  failedValidation?: boolean;
  imdbID?: string;
  language?: string;
  season?: string;
  startYear?: string;
  title?: string;
  tmdbID?: number;
  type?: string;
  year?: string;
  count?: number;

  // Added automatically:
  createdAt?: string;
  updatedAt?: string;
}

export interface FailedLookupsInterfaceDocument extends mongoose.Document, FailedLookupsInterface {}

const FailedLookupsSchema = new Schema({
  count: { type: Number, default: 1 },
  episode: { type: String },
  imdbID: { type: String, index: true },
  language: { type: String },
  season: { type: String },
  startYear: { type: String },
  title: { type: String, required: true },
  tmdbID: { index: true, type: Number },
  year: { type: String },
  failedValidation: { type: Boolean, default: false },
  type: { type: String },
  createdAt: {
    default: Date.now,
    expires: THIRTY_DAYS_IN_SECONDS,
    type: Date,
  },
}, {
  collection: 'failed_lookups',
  timestamps: true,
});

FailedLookupsSchema.index({ title: 1, language: 1, year: 1 });
FailedLookupsSchema.index({ title: 1, episode: 1, season: 1 });
FailedLookupsSchema.index({ title: 1, language: 1, episode: 1, season: 1 });
FailedLookupsSchema.index({ title: 1, type: 1 });
FailedLookupsSchema.index({ title: 1, type: 1, startYear: 1 });
FailedLookupsSchema.index({ language: 1, type: 1, imdbID: 1, tmdbID: 1, season: 1, episode: 1 })

const FailedLookups = mongoose.model<FailedLookupsInterfaceDocument>('FailedLookups', FailedLookupsSchema);

FailedLookups.on('index', function(err) {
  if (err) {
    console.error('FailedLookups index error: %s', err);
  } else {
    console.info('FailedLookups indexing complete');
  }
});

export default FailedLookups;
