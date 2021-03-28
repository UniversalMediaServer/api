import * as objectMapper from 'object-mapper';
import * as _ from 'lodash';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';

const openSubtitlesMovieMap = {
  'metadata.cast': [
    {
      key: 'actors?',
      transform: val => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],
  'metadata.genres': [
    {
      key: 'genres?',
      transform: val => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],

  'metadata.rating': [
    {
      key: 'rating',
      transform: val => parseFloat(val),
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
      transform: val => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],
  'metadata.genres': [
    {
      key: 'genres?',
      transform: val => _.isEmpty(_.values(val)) ? null : _.values(val),
    },
  ],

  'metadata.rating': [
    {
      key: 'rating',
      transform: val => parseFloat(val),
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
    transform: val => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'boxoffice': 'boxoffice',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
  },
  'episode': 'episode',
  'imdbid': 'imdbID',
  'genres': {
    key: 'genres?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
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
    transform: val => 'episode',
  },
  'votes': 'votes',
  'year': {
    key: 'year',
    transform: val => val ? val.toString() : undefined,
  },
};

const imdbSeriesMap = {
  'actors': {
    key: 'actors?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
  },
  'end_year': {
    key: 'endYear',
    transform: val => val ? val.toString() : undefined,
  },
  'imdbid': 'imdbID',
  'title': 'title',
  'genres': {
    key: 'genres?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
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
    transform: val => val ? val.toString() : undefined,
  },
  'totalseasons': 'totalSeasons',
  'type': 'type',
  'votes': 'votes',
  'year': {
    key: 'year',
    transform: val => val ? val.toString() : undefined,
  },
};

const imdbMovieMap = {
  'actors': {
    key: 'actors?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
  },
  'awards': 'awards',
  'boxoffice': 'boxoffice',
  'country': 'country',
  'director': {
    key: 'directors?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
  },
  'genres': {
    key: 'genres?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
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
    transform: val => 'movie',
  },
  'votes': 'votes',
  'year': {
    key: 'year',
    transform: val => val ? val.toString() : undefined,
  },
};

const removeNotApplicable = (obj): Partial<MediaMetadataInterface | SeriesMetadataInterface> => {
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
    return removeNotApplicable(mappedData);
  }

  parseOpenSubtitlesEpisodeResponse(openSubtitlesData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(openSubtitlesData, openSubtitlesEpisodeMap);
    return removeNotApplicable(mappedData);
  }

  parseIMDBAPIEpisodeResponse(imdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(imdbData, imdbEpisodeMap);
    return removeNotApplicable(mappedData);
  }

  parseIMDBAPISeriesResponse(imdbData): Partial<SeriesMetadataInterface> {
    if (imdbData.type !== 'series') {
      throw new Error('Expected series type');
    }
    const mappedData = objectMapper.merge(imdbData, imdbSeriesMap);
    return removeNotApplicable(mappedData);
  }

  parseIMDBAPIMovieResponse(imdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(imdbData, imdbMovieMap);
    return removeNotApplicable(mappedData);
  }
}

export const mapper = new UmsDataMapper();
