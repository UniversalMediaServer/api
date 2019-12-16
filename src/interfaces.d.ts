interface CustomError extends Error {
  status?: number;
}

interface OpensubtitlesIdentifyResponse {
  subcount: string;
  added: boolean;
  metadata: {
    imdbid: string;
    title: string;
    year: string;
    cast: {
      [key: string]: string;
    };
    country: [string];
    cover: string;
    directors: object;
    duration: string;
    genres: [string];
    rating: string;
    trivia: string;
    goofs: string;
    votes: string;
    language: [string];
    aka: [string];
    awards: [string];
    tagline: string;
  };
  moviehash: string;
  moviebytesize: number;
  type: string;
}
