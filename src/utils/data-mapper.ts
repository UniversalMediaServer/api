import * as objectMapper from 'object-mapper';
import * as _ from 'lodash';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';
import { Genre } from 'moviedb-promise/dist/types';
import { SeasonMetadataInterface } from '../models/SeasonMetadata';

const openSubtitlesMovieMap = {
  'metadata.cast': [
    {
      key: 'actors?',
      transform: (val): Array<string> => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],
  'metadata.genres': [
    {
      key: 'genres?',
      transform: (val): Array<string> => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],

  'metadata.rating': [
    {
      key: 'rating',
      transform: (val: string): number => parseFloat(val),
    },
  ],
  'metadata.goofs': 'goofs',
  'metadata.cover': 'poster',
  'metadata.imdbid': 'imdbID',
  'moviehash': 'osdbHash',
  'metadata.tagline': 'tagline',
  'metadata.title': 'title',
  'metadata.trivia': 'trivia',
  'metadata.duration': 'runtime',
  'type': 'type',
  'metadata.year': 'year',
  'metadata.votes': 'votes',
};

const openSubtitlesEpisodeMap = {
  'metadata.cast': [
    {
      key: 'actors?',
      transform: (val): Array<string> => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],
  'metadata.genres': [
    {
      key: 'genres?',
      transform: (val): Array<string> => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],

  'metadata.rating': [
    {
      key: 'rating',
      transform: (val: string): number => parseFloat(val),
    },
  ],
  'metadata.goofs': 'goofs',
  'metadata.cover': 'poster',
  'metadata.imdbid': 'imdbID',
  'moviehash': 'osdbHash',
  'metadata.tagline': 'tagline',
  'metadata.episode_title': 'title',
  'metadata.trivia': 'trivia',
  'metadata.duration': 'runtime',
  'type': 'type',
  'metadata.year': 'year',
  'metadata.votes': 'votes',
  'metadata.season': 'season',
  'metadata.episode': 'episode',
};

const tmdbEpisodeMap = {
  'air_date': [
    { key: 'released' },
    {
      key: 'year',
      transform: (releaseDate: string): string => {
        // Store the year part of the date
        return releaseDate ? releaseDate.substr(0, 4) : null;
      },
    },
  ],
  'credits': 'credits',
  'episode_number': 'episode',
  'external_ids.imdb_id': 'imdbID',
  'external_ids': 'externalIDs',
  'id': 'tmdbID',
  'images': 'images',
  'name': 'title',
  'overview': 'plot',
  'season_number': 'season',
  'still_path': 'posterRelativePath',
  'type': {
    key: 'type',
    transform: (): string => 'episode',
  },
};

const tmdbSeasonMap = {
  'air_date': 'airDate',
  'credits': 'credits',
  'external_ids': 'externalIDs',
  'id': 'tmdbID',
  'images': 'images',
  'name': 'name',
  'overview': 'overview',
  'season_number': 'seasonNumber',
};

const tmdbSeriesMap = {
  'created_by': 'createdBy',
  'credits': 'credits',
  'external_ids.imdb_id': 'imdbID',
  'external_ids': 'externalIDs',
  'first_air_date': [
    { key: 'released' },
    {
      key: 'year',
      transform: (releaseDate: string): string => {
        // Store the year part of the date
        return releaseDate ? releaseDate.substr(0, 4) : null;
      },
    },
    { key: 'startYear' },
  ],
  'genres': {
    key: 'genres?',
    transform: (genres: Array<Genre>): Array<string> => {
      return genres.map(genre => genre.name);
    },
  },
  'homepage': 'homepage',
  'id': 'tmdbID',
  'images': 'images',
  'in_production': 'inProduction',
  'languages': 'languages',
  'last_air_date': 'lastAirDate',
  'name': 'title',
  'networks': 'networks',
  'number_of_episodes': 'numberOfEpisodes',
  'number_of_seasons': 'totalSeasons',
  'origin_country': 'originCountry',
  'original_language': 'originalLanguage',
  'original_title': 'originalTitle',
  'overview': 'plot',
  'poster_path': 'posterRelativePath',
  'production_companies': 'productionCompanies',
  'production_countries': 'productionCountries',
  'seasons': 'seasons',
  'spoken_languages': 'spokenLanguages',
  'status': 'status',
  'tagline': 'tagline',
  'type': [
    { key: 'seriesType' }, // tmdb uses "type" to mean the type of series
    {
      key: 'type',
      transform: (): string => 'series',
    },
  ],
};

const tmdbMovieMap = {
  'budget': 'budget',
  'credits': 'credits',
  'external_ids': 'externalIDs',
  'genres': {
    key: 'genres?',
    transform: (genres: Array<Genre>): Array<string> => {
      return genres.map(genre => genre.name);
    },
  },
  'id': 'tmdbID',
  'images': 'images',
  'imdb_id': 'imdbID',
  'original_language': 'originalLanguage',
  'original_title': 'originalTitle',
  'overview': 'plot',
  'poster_path': 'posterRelativePath',
  'production_companies': 'productionCompanies',
  'release_date': [
    { key: 'released' },
    {
      key: 'year',
      transform: (releaseDate: string): string => {
        // Store the year part of the date
        return releaseDate ? releaseDate.substr(0, 4) : null;
      },
    },
  ],
  'revenue': 'revenue',
  'runtime': 'runtime',
  'spoken_languages': 'spokenLanguages',
  'tagline': 'tagline',
  'title': 'title',
  'type': {
    key: 'type',
    transform: (): string => 'movie',
  },
};

const omdbEpisodeMap = {
  'actors': {
    key: 'actors?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'boxoffice': 'boxoffice',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'episode': 'episode',
  'imdbid': 'imdbID',
  'genres': {
    key: 'genres?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'metascore': 'metascore',
  'plot': 'plot',
  'production': 'production',
  'poster': 'poster',
  'rated': 'rated',
  'rating': 'rating',
  'ratings': {
    key: 'ratings?',
    transform: val => {
      if (_.isEmpty(val)) {
        return null;
      }

      const transformedValue = [];
      for (const rating of val) {
        transformedValue.push({ Source: rating.source || rating.Source, Value: rating.value || rating.Value });
      }
      return transformedValue;
    },
  },
  'released': 'released',
  'runtime': 'runtime',
  'season': 'season',
  'seriesid': 'seriesIMDbID',
  'title': 'title',
  'type': 'type',
  'votes': 'votes',
  'year': {
    key: 'year',
    transform: (val: number): string => val ? val.toString() : undefined,
  },
};

const omdbSeriesMap = {
  'actors': {
    key: 'actors?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'end_year': {
    key: 'endYear',
    transform: (val: number): string => val ? val.toString() : undefined,
  },
  'imdbid': 'imdbID',
  'title': 'title',
  'genres': {
    key: 'genres?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'metascore': 'metascore',
  'plot': 'plot',
  'poster': 'poster',
  'rated': 'rated',
  'rating': 'rating',
  'ratings': {
    key: 'ratings?',
    transform: val => {
      if (_.isEmpty(val)) {
        return null;
      }

      const transformedValue = [];
      for (const rating of val) {
        transformedValue.push({ Source: rating.source, Value: rating.value });
      }
      return transformedValue;
    },
  },
  'start_year': [
    {
      key: 'startYear',
      transform: (val: number): string => val ? val.toString() : undefined,
    },
    { key: 'year' },
  ],
  'totalseasons': {
    key: 'totalSeasons',
    transform: (val): number => {
      if (val) {
        const parsedValue = parseFloat(val);
        if (!isNaN(parsedValue)) {
          return parsedValue;
        }
      }
      return undefined;
    },
  },
  'type': 'type',
  'votes': 'votes',
};

const omdbMovieMap = {
  'actors': {
    key: 'actors?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'boxoffice': 'boxoffice',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'genres': {
    key: 'genres?',
    transform: (val: string): Array<string> => _.isEmpty(val) ? null : val.split(', '),
  },
  'imdbid': 'imdbID',
  'metascore': 'metascore',
  'plot': 'plot',
  'production': 'production',
  'poster': 'poster',
  'rated': 'rated',
  'rating': 'rating',
  'ratings': {
    key: 'ratings?',
    transform: val => {
      if (_.isEmpty(val)) {
        return null;
      }

      const transformedValue = [];
      for (const rating of val) {
        transformedValue.push({ Source: rating.source, Value: rating.value });
      }
      return transformedValue;
    },
  },
  'released': 'released',
  'runtime': 'runtime',
  'title': 'title',
  'type': {
    key: 'type',
    transform: (): string => 'movie',
  },
  'votes': 'votes',
  'year': {
    key: 'year',
    transform: (val: number): string => val ? val.toString() : undefined,
  },
};

const filterUnwantedValues = (obj): Partial<MediaMetadataInterface | SeriesMetadataInterface> => {
  return _.pickBy(obj, (v) => {
    if (typeof v === 'object') {
      return _.pull(v, 'N/A');
    }
    return v !== 'N/A' && v !== 'NaN' && v !== undefined && v !== null;
  });
};

/*
 * Ensures that IMDb IDs have "tt" at the start.
 * This is because APIs sometimes return IMDb IDs with
 * only one or no "t".
 * For example from OMDb for Ultimate Tag we received
 * t10329660 which is correct when you add the extra "t".
 */
const ensureIMDbIDFormat = (metadata, propertyName = 'imdbID'): Partial<MediaMetadataInterface | SeriesMetadataInterface> => {
  if (
    !metadata ||
    !metadata[propertyName] ||
    metadata[propertyName].startsWith('tt')
  ) {
    return metadata;
  }

  if (metadata[propertyName].startsWith('t')) {
    metadata[propertyName] = 't' + metadata[propertyName];
    return metadata;
  }

  metadata[propertyName] = 'tt' + metadata[propertyName];
  return metadata;
};

class UmsDataMapper {
  parseOpenSubtitlesResponse(openSubtitlesData): Partial<MediaMetadataInterface> {
    let mappedData = objectMapper.merge(openSubtitlesData, openSubtitlesMovieMap);
    mappedData = filterUnwantedValues(mappedData);
    return ensureIMDbIDFormat(mappedData);
  }

  parseOpenSubtitlesEpisodeResponse(openSubtitlesData): Partial<MediaMetadataInterface> {
    let mappedData = objectMapper.merge(openSubtitlesData, openSubtitlesEpisodeMap);
    mappedData = filterUnwantedValues(mappedData);
    return ensureIMDbIDFormat(mappedData);
  }

  parseTMDBAPIEpisodeResponse(tmdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbEpisodeMap);
    return filterUnwantedValues(mappedData);
  }

  parseTMDBAPISeasonResponse(tmdbData): Partial<SeasonMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbSeasonMap);
    return filterUnwantedValues(mappedData);
  }

  parseTMDBAPISeriesResponse(tmdbData): Partial<SeriesMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbSeriesMap);
    return filterUnwantedValues(mappedData);
  }

  parseTMDBAPIMovieResponse(tmdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbMovieMap);
    return filterUnwantedValues(mappedData);
  }

  parseOMDbAPIEpisodeResponse(omdbData): Partial<MediaMetadataInterface> {
    let mappedData = objectMapper.merge(omdbData, omdbEpisodeMap);
    mappedData = filterUnwantedValues(mappedData);
    mappedData = ensureIMDbIDFormat(mappedData);
    return ensureIMDbIDFormat(mappedData, 'seriesIMDbID');
  }

  parseOMDbAPISeriesResponse(omdbData): Partial<SeriesMetadataInterface> {
    let mappedData = objectMapper.merge(omdbData, omdbSeriesMap);
    mappedData = filterUnwantedValues(mappedData);
    return ensureIMDbIDFormat(mappedData);
  }

  parseOMDbAPIMovieResponse(omdbData): Partial<MediaMetadataInterface> {
    let mappedData = objectMapper.merge(omdbData, omdbMovieMap);
    mappedData = filterUnwantedValues(mappedData);
    return ensureIMDbIDFormat(mappedData);
  }
}

export const mapper = new UmsDataMapper();
