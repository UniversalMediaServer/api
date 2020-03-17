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
