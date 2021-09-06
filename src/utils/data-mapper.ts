import * as objectMapper from 'object-mapper';
import * as _ from 'lodash';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';
import { Genre } from 'moviedb-promise/dist/types';

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
  'air_date': 'released',
  'credits': 'credits',
  'episode_number': 'episode',
  'external_ids.imdb_id': 'imdbID',
  'external_ids.tvdb_id': 'tvdbID',
  'id': 'tmdbID',
  'images': 'images',
  'name': 'title',
  'overview': 'plot',
  'season_number': 'season',
  'type': {
    key: 'type',
    transform: (): string => 'episode',
  },
};

const tmdbMovieMap = {
  'budget': 'budget',
  'credits': 'credits',
  'external_ids.imdb_id': 'imdbID',
  'genres': {
    key: 'genres?',
    transform: (genres: Array<Genre>): Array<string> => {
      return genres.map(genre => genre.name);
    },
  },
  'id': 'tmdbID',
  'images': 'images',
  'original_language': 'originalLanguage',
  'original_title': 'originalTitle',
  'overview': 'plot',
  'production_companies': 'productionCompanies',
  'release_date': 'released',
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
  'type': {
    key: 'type',
    transform: (): string => 'episode',
  },
  'votes': 'votes',
  'year': {
    key: 'year',
    transform: (val: number): string => val ? val.toString() : undefined,
  },
};

const imdbSeriesMap = {
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
  'start_year': {
    key: 'startYear',
    transform: (val: number): string => val ? val.toString() : undefined,
  },
  'totalseasons': 'totalSeasons',
  'totalSeasons': {
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
  'year': {
    key: 'year',
    transform: (val: number): string => val ? val.toString() : undefined,
  },
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

class UmsDataMapper {
  parseOpenSubtitlesResponse(openSubtitlesData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(openSubtitlesData, openSubtitlesMovieMap);
    return filterUnwantedValues(mappedData);
  }

  parseOpenSubtitlesEpisodeResponse(openSubtitlesData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(openSubtitlesData, openSubtitlesEpisodeMap);
    return filterUnwantedValues(mappedData);
  }

  parseTMDBAPIEpisodeResponse(tmdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbEpisodeMap);
    return filterUnwantedValues(mappedData);
  }

  parseTMDBAPIMovieResponse(tmdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbMovieMap);
    return filterUnwantedValues(mappedData);
  }

  parseOMDbAPIEpisodeResponse(omdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(omdbData, omdbEpisodeMap);
    return filterUnwantedValues(mappedData);
  }

  parseOMDbAPISeriesResponse(omdbData): Partial<SeriesMetadataInterface> {
    const mappedData = objectMapper.merge(omdbData, imdbSeriesMap);
    return filterUnwantedValues(mappedData);
  }

  parseOMDbAPIMovieResponse(omdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(omdbData, omdbMovieMap);
    return filterUnwantedValues(mappedData);
  }
}

export const mapper = new UmsDataMapper();
