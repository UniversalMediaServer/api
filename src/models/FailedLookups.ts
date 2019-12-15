import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

mongoose.set('useCreateIndex', true);

interface FailedLookupsInterface extends Document {
  added: boolean;
  moviebytesize: number;
  moviehash: string;
}

const FailedLookupsSchema: Schema = new Schema({
  osdbHash: {
    type: String,
    index: true,
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 16;
      },
      msg: 'Invalid osdb hash length.',
    }
  },
}, {
  collection: 'failed_lookups',
  timestamps: true,
});

const FailedLookups = mongoose.model<FailedLookupsInterface>('FailedLookups', FailedLookupsSchema);
export default FailedLookups;
