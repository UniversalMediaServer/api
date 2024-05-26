interface CustomError extends Error {
  status?: number;
}

interface UmsQueryParams {
  title?: string;
  year?: string;
  imdbid?: string;
  imdbID?: string;
  filebytesize?: string;
  episode?: string;
  season?: string;
  osdbHash?: string;
  language?: string;
  mediaType?: string;
  tmdbID?: number;
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