import { MovieDb } from 'moviedb-promise';

export const moviedb = new MovieDb(process.env.TMDB_API_KEY);
if (process.env.NODE_ENV === 'production' && !process.env.TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY not set');
}
