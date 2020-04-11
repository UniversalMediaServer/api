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
  'title': 'episodeTitle',
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
  'type': 'type',
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
  'votes': 'votes',
  'year': {
    key: 'year',
    transform: val => val ? val.toString() : undefined,
  },
};

class UmsDataMapper {
  parseOpenSubtitlesResponse(openSubtitlesData): MediaMetadataInterface {
    return objectMapper(openSubtitlesData, openSubtitlesMap);
  }

  parseIMDBAPIEpisodeResponse(imdbData): MediaMetadataInterface {
    return objectMapper(imdbData, imdbEpisodeMap);
  }

  parseIMDBAPISeriesResponse(imdbData): SeriesMetadataInterface {
    return objectMapper(imdbData, imdbSeriesMap);
  }
}

export const mapper = new UmsDataMapper();
