import * as objectMapper from 'object-mapper';
import * as _ from 'lodash';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';

const openSubtitlesMap = {  
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
  'episode': 'episodeNumber',
  'imdbid': 'imdbID',
  'genres': {
    key: 'genres?',
    transform: val => _.isEmpty(val) ? null : val.split(', '),
  },
  'metascore': 'metascore',
  'production': 'production',
  'poster': 'poster',
  'rated': 'rated',
  'rating': 'rating',
  'ratings': 'ratings',
  'released': 'released',
  'runtime': 'runtime',
  'season': 'seasonNumber',
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
  'ratings': 'ratings',
  'start_year': {
    key: 'startYear',
    transform: val => val ? val.toString() : undefined,
  },
  'totalseasons': 'totalSeasons',
  'type': {
    key: 'type',
    transform: val => 'series',
  },
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
  'production': 'production',
  'poster': 'poster',
  'rated': 'rated',
  'rating': 'rating',
  'ratings': 'ratings',
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

const removeNotApplicable = (obj): any => {
  return _.pickBy(obj, (v) => {
    if (typeof v === 'object') {
      return _.pull(v, 'N/A');
    }
    return v !== 'N/A';
  });
};

class UmsDataMapper {
  parseOpenSubtitlesResponse(openSubtitlesData): MediaMetadataInterface {
    const mappedData = objectMapper(openSubtitlesData, openSubtitlesMap);
    return removeNotApplicable(mappedData);
  }

  parseIMDBAPIEpisodeResponse(imdbData): MediaMetadataInterface {
    const mappedData = objectMapper(imdbData, imdbEpisodeMap);
    return removeNotApplicable(mappedData);
  }

  parseIMDBAPISeriesResponse(imdbData): SeriesMetadataInterface {
    const mappedData = objectMapper(imdbData, imdbSeriesMap);
    return removeNotApplicable(mappedData);
  }

  parseIMDBAPIMovieResponse(imdbData): MediaMetadataInterface {
    const mappedData = objectMapper(imdbData, imdbMovieMap);
    return removeNotApplicable(mappedData);
  }
}

export const mapper = new UmsDataMapper();
