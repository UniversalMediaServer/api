import * as objectMapper from 'object-mapper';
import * as _ from 'lodash';
import { MediaMetadataInterface, Rating } from '../models/MediaMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';

const openSubtitlesMovieMap = {
  'metadata.cast': [
    {
      key: 'actors?',
      transform: (val: Record<string, string>): string[] => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],
  'metadata.genres': [
    {
      key: 'genres?',
      transform: (val: Record<string, string>): string[] => _.isEmpty(_.values(val)) ? null : _.values(val),
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
      transform: (val: Record<string, string>): string[] => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],
  'metadata.genres': [
    {
      key: 'genres?',
      transform: (val: Record<string, string>): string[] => _.isEmpty(_.values(val)) ? null : _.values(val),
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

const imdbEpisodeMap = {
  'actors': {
    key: 'actors?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'boxoffice': 'boxoffice',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'episode': 'episode',
  'imdbid': 'imdbID',
  'genres': {
    key: 'genres?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'metascore': 'metascore',
  'plot': 'plot',
  'production': 'production',
  'poster': 'poster',
  'rated': 'rated',
  'rating': 'rating',
  'ratings': {
    key: 'ratings?',
    transform: (val: Rating[]): Rating[] => {
      if (_.isEmpty(val)) {
        return null;
      }

      const transformedValue: Rating[] = [];
      for (const rating of val) {
        transformedValue.push({
          Source: rating.source || rating.Source,
          Value: rating.value || rating.Value,
        });
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
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'end_year': {
    key: 'endYear',
    transform: (val: number): string => val ? val.toString() : undefined,
  },
  'imdbid': 'imdbID',
  'title': 'title',
  'genres': {
    key: 'genres?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'metascore': 'metascore',
  'plot': 'plot',
  'poster': 'poster',
  'rated': 'rated',
  'rating': 'rating',
  'ratings': {
    key: 'ratings?',
    transform: (val: Rating[]): Rating[] => {
      if (_.isEmpty(val)) {
        return null;
      }

      const transformedValue: Rating[] = [];
      for (const rating of val) {
        transformedValue.push({
          Source: rating.source,
          Value: rating.value,
        });
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
    transform: val => {
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

const imdbMovieMap = {
  'actors': {
    key: 'actors?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'boxoffice': 'boxoffice',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
  },
  'genres': {
    key: 'genres?',
    transform: (val: string): string[] => _.isEmpty(val) ? null : val.split(', '),
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
    transform: (val: Rating[]): Rating[] => {
      if (_.isEmpty(val)) {
        return null;
      }

      const transformedValue: Rating[] = [];
      for (const rating of val) {
        transformedValue.push({
          Source: rating.source,
          Value: rating.value,
        });
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

const filterUnwantedValues = (obj): any => {
  return _.pickBy(obj, (v) => {
    if (typeof v === 'object') {
      return _.pull(v, 'N/A');
    }
    return v !== 'N/A' && v !== 'NaN' && v !== undefined && v !== null;
  });
};

class UmsDataMapper {
  parseOpenSubtitlesResponse(openSubtitlesData): MediaMetadataInterface {
    const mappedData = objectMapper.merge(openSubtitlesData, openSubtitlesMovieMap);
    return filterUnwantedValues(mappedData);
  }

  parseOpenSubtitlesEpisodeResponse(openSubtitlesData): MediaMetadataInterface {
    const mappedData = objectMapper.merge(openSubtitlesData, openSubtitlesEpisodeMap);
    return filterUnwantedValues(mappedData);
  }

  parseIMDBAPIEpisodeResponse(imdbData): MediaMetadataInterface {
    const mappedData = objectMapper.merge(imdbData, imdbEpisodeMap);
    return filterUnwantedValues(mappedData);
  }

  parseIMDBAPISeriesResponse(imdbData): SeriesMetadataInterface {
    const mappedData = objectMapper.merge(imdbData, imdbSeriesMap);
    return filterUnwantedValues(mappedData);
  }

  parseIMDBAPIMovieResponse(imdbData): MediaMetadataInterface {
    const mappedData = objectMapper.merge(imdbData, imdbMovieMap);
    return filterUnwantedValues(mappedData);
  }
}

export const mapper = new UmsDataMapper();
