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
  count: {
    default: 1,
    type: Number,
  },
  episode: { index: true, type: String },
  imdbID: { index: true, type: String },
  language: { index: true, type: String },
  season: { index: true, type: String },
  startYear: {
    index: true,
    type: String,
  },
  title: {
    index: true,
    required: true,
    type: String,
  },
  tmdbID: { index: true, type: Number },
  year: {
    index: true,
    type: String,
  },
  failedValidation: {
    default: false,
    type: Boolean,
  },
  type: { type: String, index: true },
  createdAt: {
    default: Date.now,
    expires: THIRTY_DAYS_IN_SECONDS,
    type: Date,
  },
}, {
  collection: 'failed_lookups',
  timestamps: true,
});

const FailedLookups = mongoose.model<FailedLookupsInterfaceDocument>('FailedLookups', FailedLookupsSchema);

FailedLookups.on('index', function(err) {
  if (err) {
    console.error('FailedLookups index error: %s', err);
  } else {
    console.info('FailedLookups indexing complete');
  }
});

export default FailedLookups;
