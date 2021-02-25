interface CustomError extends Error {
  status?: number;
}

interface OpensubtitlesIdentifyResponse {
  added: boolean;
  metadata: {
    aka: string[];
    awards: string[];
    cast: {
      [key: string]: string;
    };
    country: string[];
    cover: string;
    directors: object;
    duration: string;
    genres: string[];
    goofs: string;
    imdbid: string;
    language: string[];
    rating: string;
    tagline: string;
    title: string;
    trivia: string;
    votes: string;
    year: string;
  };
  moviebytesize: number;
  moviehash: string;
  subcount: string;
  type: string;
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
}

interface GetVideoFilter {
  year?: string;
  episode?: string;
  searchMatches?: object;
  season?: string;
  title?: string;
}
