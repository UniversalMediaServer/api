import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

const DOCUMENT_EXPIRY_IN_SECONDS = 2592000; // 30 days

export interface FailedLookupsInterface {
  episode?: number;
  failedValidation?: boolean;
  imdbID?: string;
  osdbHash?: string;
  season?: number;
  title?: string;
  type?: string;
  year?: string;
  count?: number;

  // Added automatically:
  createdAt?: string;
  updatedAt?: string;
}

export interface FailedLookupsInterfaceDocument extends Document, FailedLookupsInterface {}

const FailedLookupsSchema: Schema = new Schema({
  count: {
    default: 1,
    type: Number,
  },
  episode: { type: Number },
  imdbID: {
    index: true,
    type: String,
  },
  osdbHash: {
    index: true,
    required: function(): boolean {
      return !this.title;
    },
    type: String,
    validate: {
      validator: function(v: string): boolean {
        return v.length === 16;
      },
      msg: 'Invalid osdb hash length.',
    },
  },
  season: { type: Number },
  title: {
    index: true,
    required: function(): boolean {
      return !this.osdbHash;
    },
    type: String,
  },
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
    expires: DOCUMENT_EXPIRY_IN_SECONDS,
    type: Date,
  },
}, {
  collection: 'failed_lookups',
  timestamps: true,
});

const FailedLookups = mongoose.model<FailedLookupsInterfaceDocument>('FailedLookups', FailedLookupsSchema);
export default FailedLookups;
