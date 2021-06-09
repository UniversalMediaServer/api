import * as mongoose from 'mongoose';
import { Schema, Document, Model } from 'mongoose';
import * as _ from 'lodash';
import * as escapeStringRegexp from 'escape-string-regexp';

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

interface BestGuessResult extends mongoose.Document {
  score: string;
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
  genres: { type: Array },
  imdbID: { type: String, required: true, index: true, unique: true },
  isEpisodesCrawled: { type: Boolean, default: false, index: true },
  metascore: { type: String },
  plot: { type: String },
  poster: { type: String },
  rated: { type: String },
  rating: { type: Number },
  ratings: { type: [new mongoose.Schema({ 'Source': String, 'Value': String })] },
  startYear: { type: String },
  title: { type: String, required: true },
  totalSeasons: { type: Number },
  type: {
    type: String,
    validate: {
      validator: (t: string): boolean =>  t === 'series',
      required: [true, 'Series Metadata must have a type, of "series".'],
    },
  },
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
  const escapedTitle = new RegExp(`^${escapeStringRegexp(title)}$`);
  const exactSearchQuery = { title: escapedTitle } as ExactSearchQuery;
  const sortBy = { score: { $meta: 'textScore' } } as SortByFilter;

  if (startYear) {
    bestGuessQuery.startYear = startYear;
    exactSearchQuery.startYear = startYear;
  } else {
    sortBy.startYear = 1;
  }

  const seriesMetadata = await this.find(exactSearchQuery).sort({ startYear: 1 });

  if (seriesMetadata[0]) {
    return seriesMetadata[0];
  }

  const bestGuesses = await this.find(bestGuessQuery, { score: { $meta: 'textScore' } })
    .sort(sortBy)
    .limit(5)
    .lean() as BestGuessResult;

  // returns the first document for an exact title match, which is already ordered by the text search score
  const hasExactMatch = _.find(bestGuesses, (doc) => doc.title.toLowerCase() === title.toLowerCase());
  if (hasExactMatch) {
    return hasExactMatch;
  }

  if (bestGuesses[0] && (bestGuesses[0].score < TEXT_SCORE_MINIMUM)) {
    return null;
  }
  return bestGuesses[0] || null;
};

SeriesMetadataSchema.virtual('imdburl').get(function() {
  return `https://www.imdb.com/title/${this.imdbID}`;
});

// this allows us to use MongoDB Full text search https://docs.mongodb.com/manual/reference/operator/query/text/#op._S_text
SeriesMetadataSchema.index({ 'title': 'text' });

const SeriesMetadata = mongoose.model<SeriesMetadataInterface, SeriesMetadataModel>('SeriesMetadata', SeriesMetadataSchema);
export default SeriesMetadata;
