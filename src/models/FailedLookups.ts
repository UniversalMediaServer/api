import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

const DOCUMENT_EXPIRY_IN_SECONDS = 2592000; // 30 days

mongoose.set('useCreateIndex', true);

export interface FailedLookupsInterface extends Document {
  osdbHash: string;
  title: string;
  language: string;

  // Added automatically:
  createdAt: string;
  updatedAt: string;
}

const FailedLookupsSchema: Schema = new Schema({
  osdbHash: {
    type: String,
    index: true,
    validate: {
      validator: function(v: string): boolean {
        return v.length === 16;
      },
      msg: 'Invalid osdb hash length.',
    },
  },
  title: {
    type: String,
    index: true,
  },
  language: {
    type: String,
    index: true,
  },
  createdAt: {
    type: Date,
    expires: DOCUMENT_EXPIRY_IN_SECONDS,
    default: Date.now // eslint-disable-line
  },
}, {
  collection: 'failed_lookups',
  timestamps: true,
});

const FailedLookups = mongoose.model<FailedLookupsInterface>('FailedLookups', FailedLookupsSchema);
export default FailedLookups;
