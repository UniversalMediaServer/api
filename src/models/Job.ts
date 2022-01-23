import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export interface JobInterface {
  jobId: string;
  status: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JobModel extends mongoose.Model<JobInterface> {}

const JobSchema: Schema = new Schema({
  jobId: { type: String, required: true },
  searches: { type: Array, required: true },
  processed: { type: Boolean, default: false },
  seriesDocumentIds: { type: Array },
  fileDocumentIds: { type: Array },
}, {
  collection: 'jobs',
  timestamps: true,
  versionKey: false,
});

const Job = mongoose.model<JobInterface, JobModel>('Job', JobSchema);
export default Job;
