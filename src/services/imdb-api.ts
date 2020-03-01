import * as imdb from 'imdb-api';
const imdbAPI = new imdb.Client({ apiKey: process.env.IMDB_API_KEY });

export default imdbAPI;
