import * as mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

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
}, {
  collection: 'failed_lookups',
  timestamps: true,
});

const FailedLookups = mongoose.model<FailedLookupsInterface>('FailedLookups', FailedLookupsSchema);
export default FailedLookups;
