import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

const DOCUMENT_EXPIRY_IN_SECONDS = 2592000; // 30 days

export interface FailedLookupsInterface {
  failedValidation?: boolean;
  osdbHash?: string;
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
  title: {
    index: true,
    required: function(): boolean {
      return !this.osdbHash;
    },
    type: String,
  },
  imdbId: {
    index: true,
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
