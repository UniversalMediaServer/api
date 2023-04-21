import * as _ from 'lodash';
import { CollectionInfoResponse, Genre } from 'moviedb-promise';
import * as objectMapper from 'object-mapper';

import { CollectionMetadataInterface } from '../models/CollectionMetadata';
import { LocalizeMetadataInterface } from '../models/LocalizeMetadata';
import { MediaMetadataInterface } from '../models/MediaMetadata';
import { SeasonMetadataInterface } from '../models/SeasonMetadata';
import { SeriesMetadataInterface } from '../models/SeriesMetadata';

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
        return releaseDate ? releaseDate.substring(0, 4) : null;
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

const tmdbIdentifyMap = {
  'id': 'tmdbID',
  'media_type': 'mediaType',
};

const tmdbIdentifyTvChildsMap = {
  'episode_number': 'episodeNumber',
  'media_type': 'mediaType',
  'season_number': 'seasonNumber',
  'show_id': 'tmdbID',
};

const tmdbLocalizeMap = {
  'episode_number': 'episodeNumber',
  'homepage': 'homepage',
  'id': 'tmdbID',
  'external_ids.imdb_id': 'imdbID',
  'name': 'title',
  'overview': 'overview',
  'poster_path': 'posterRelativePath',
  'season_number': 'seasonNumber',
  'tagline': 'tagline',
  'title': 'title',
};

const tmdbSeasonMap = {
  'air_date': 'airDate',
  'credits': 'credits',
  'external_ids': 'externalIDs',
  'id': 'tmdbID',
  'images': 'images',
  'name': 'name',
  'overview': 'overview',
  'poster_path': 'posterRelativePath',
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
        return releaseDate ? releaseDate.substring(0, 4) : null;
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

const tmdbCollectionMap = {
  'id': 'tmdbID',
  'images': 'images',
  'name': 'name',
  'overview': 'overview',
  'poster_path': 'posterRelativePath',
  'parts': {
    key: 'movieTmdbIds?',
    transform: (parts: Array<{id?: number}>): Array<number> => {
      return parts.map(part => part.id);
    },
  },
};

const tmdbMovieMap = {
  'belongs_to_collection.id': 'collectionTmdbID',
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
        return releaseDate ? releaseDate.substring(0, 4) : null;
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

const filterUnwantedValues = (obj): Partial<MediaMetadataInterface | SeriesMetadataInterface> => {
  return _.pickBy(obj, (v) => {
    if (typeof v === 'object') {
      return _.pull(v, 'N/A');
    }
    return v !== 'N/A' && v !== 'NaN' && v !== undefined && v !== null;
  });
};

const filterUnwantedLocalizeValues = (obj): Partial<LocalizeMetadataInterface> => {
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

  parseTMDBAPICollectionResponse(tmdbData: CollectionInfoResponse): Partial<CollectionMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbCollectionMap);
    return filterUnwantedValues(mappedData);
  }

  parseTMDBAPIMovieResponse(tmdbData): Partial<MediaMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbMovieMap);
    return filterUnwantedValues(mappedData);
  }

  parseTMDBAPIIdentifyResponse(tmdbData): Partial<TmdbIdentifyResponse> {
    const mappedData = objectMapper.merge(tmdbData, tmdbIdentifyMap);
    return filterUnwantedLocalizeValues(mappedData);
  }

  parseTMDBAPIIdentifyTvChildsResponse(tmdbData): Partial<TmdbIdentifyResponse> {
    const mappedData = objectMapper.merge(tmdbData, tmdbIdentifyTvChildsMap);
    return filterUnwantedLocalizeValues(mappedData);
  }

  parseTMDBAPILocalizeResponse(tmdbData): Partial<LocalizeMetadataInterface> {
    const mappedData = objectMapper.merge(tmdbData, tmdbLocalizeMap);
    return filterUnwantedLocalizeValues(mappedData);
  }
}

export const mapper = new UmsDataMapper();
