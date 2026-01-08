interface CustomError extends Error {
  status?: number;
}

interface DeprecatedUmsQueryParams {
  filebytesize?: string;
  osdbHash?: string;
}

interface UmsQueryParams {
  episode?: string;
  filename?: string;
  imdbid?: string;
  imdbID?: string;
  language?: string;
  mediaType?: string;
  season?: string;
  title?: string;
  tmdbID?: number;
  year?: string;
}

interface GetVideoFilter {
  year?: string;
  episode?: string;
  searchMatches?: object;
  season?: string;
}

interface GetSeriesFilter {
  startYear?: string;
  searchMatches?: object;
}

interface CaseInsensitiveSearchQuery {
  title: {
    $regex: RegExp;
    $options: string;
  };
  startYear?: string;
}

interface TmdbIdentifyResponse {
  mediaType: string;
  tmdbID: number;
  seasonNumber?: number;
  episodeNumber?: number;
}