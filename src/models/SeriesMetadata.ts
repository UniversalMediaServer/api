import * as mongoose from 'mongoose';
import { Schema, Document, Model  } from 'mongoose';

const TEXT_SCORE_MINIMUM = 1;

export interface SeriesMetadataInterface extends Document {
  actors: Array<string>;
  awards?: string;
  country?: string;
  directors: Array<string>;
  genres: Array<string>;
  imdbID: string;
  isEpisodesCrawled?: boolean;
  metascore?: string;
  poster?: string;
  rated?: string; // e.g 'PG-13'
  rating?: number; // e.g. 6.7
  ratings?: Array<{Source: string; Value: string}>;
  startYear?: string;
  endYear?: string;
  title: string;
  type: string;
  totalSeasons?: number;
  votes?: string;
  year: string;
}

interface BestGuessQuery {
  $text: {
    $search: string;
    $caseSensitive: boolean;
  };
  startYear: string;
}

interface SortByFilter {
  score: { $meta: string };
  startYear: number;
}

export interface SeriesMetadataModel extends Model<SeriesMetadataInterface> {
  findSimilarSeries(dirOrFilename: string, startYear?: string): Promise<SeriesMetadataInterface>; 
}

const SeriesMetadataSchema: Schema = new Schema({
  actors: { type: Array },
  awards: { type: String },
  country: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  directors: { type: Array },
  endYear: { type: String },
  genres: { type: Array, required: true },
  imdbID: { type: String, required: true, index: true, unique: true },
  isEpisodesCrawled: { type: Boolean, default: false, index: true },
  metascore: { type: String },
  plot: { type: String },
  poster: { type: String },
  rated: { type: String },
  rating: { type: Number },
  ratings: { type: [new mongoose.Schema({ 'Source': String, 'Value': String })], required: true },
  startYear: { type: String },
  title: { type: String, required: true },
  totalSeasons: { type: Number },
  type: { type: String, default: 'series', required: true },
  votes: { type: String },
  year: { type: String },
}, {
  collection: 'series_metadata',
  timestamps: true,
  versionKey: false,
});

/**
 * Finds a similar or exact match.
 *
 * @param title The series title.
 * @param [startYear] The year the series started. If provided, only exact
 *                    matches are returned. If not provided, the oldest year
 *                    match will be returned.
 */
SeriesMetadataSchema.statics.findSimilarSeries = async function(title: string, startYear?: string): Promise<SeriesMetadataInterface | null> {
  const bestGuessQuery = { $text: { $search: title, $caseSensitive: false } } as BestGuessQuery;
  const sortBy = { score: { $meta: 'textScore' } } as SortByFilter;

  if (startYear) {
    bestGuessQuery.startYear = startYear;
  } else {
    sortBy.startYear = 1;
  }

  const bestGuess = await this.find(bestGuessQuery, { score: { $meta: 'textScore' } })
    .sort(sortBy)
    .limit(1)
    .lean();

  if (bestGuess[0] && (bestGuess[0].score < TEXT_SCORE_MINIMUM)) {
    return null;
  }
  return bestGuess[0] || null;
};

SeriesMetadataSchema.virtual('imdburl').get(function() {
  return `https://www.imdb.com/title/${this.imdbID}`;
});

// this allows us to use MongoDB Full text search https://docs.mongodb.com/manual/reference/operator/query/text/#op._S_text
SeriesMetadataSchema.index({ 'title': 'text' });

const SeriesMetadata = mongoose.model<SeriesMetadataInterface, SeriesMetadataModel>('SeriesMetadata', SeriesMetadataSchema);
export default SeriesMetadata;
