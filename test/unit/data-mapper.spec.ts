import { mapper } from '../../src/utils/data-mapper';

const openSubtitlesData = {
  subcount: '7',
  added: false,
  metadata: {
    imdbid: 'tt0462538',
    title: 'The Simpsons Movie',
    year: '2007',
    cast: {
      _0144657: 'Dan Castellaneta',
      _0001413: 'Julie Kavner',
      _0004813: 'Nancy Cartwright',
      _0810379: 'Yeardley Smith',
      _0000279: 'Hank Azaria',
      _0733427: 'Harry Shearer',
      _0370788: 'Pamela Hayden',
      _0534134: 'Tress MacNeille',
      _0000983: 'Albert Brooks',
      _0927293: 'Karl Wiedergott',
      _0908761: 'Marcia Wallace',
      _0853122: 'Russi Taylor',
      _0744648: 'Maggie Roswell',
      _0742814: 'Phil Rosenthal',
      _0035626: 'Billie Joe Armstrong',
    },
    country: [],
    cover: 'https://m.media-amazon.com/images/M/MV5BMTgxMDczMTA5N15BMl5BanBnXkFtZTcwMzk1MzMzMw@@._V1_UX182_CR0,0,182,268_AL_.jpg',
    directors: {},
    duration: '87 min',
    genres: [],
    rating: '7.3',
    synopsis: undefined,
    trivia: '(at around 59 minutes) When Homer dreams of going up and down through several truncated stairs into the "Boob Lady" tent, is an homage to the 1951 art work of M.C. Escher titled "House of Stairs."',
    goofs: 'When the wall is put up around the lake it is built right next to it, but when Homer dumps the silo the wall\'s much further away from the water.',
    votes: '299892',
    language: [],
    aka: [],
    awards: [],
    tagline: 'For years, lines have been drawn...and then colored in yellow.',
  },
  moviehash: '8e245d9679d31e12',
  moviebytesize: 12909756,
  type: 'movie',
};

const imdbApiEpisode = {
  title: 'One Last Thing',
  year: 2013,
  rated: 'TV-MA',
  released: '2013-11-23T11:00:00.000Z',
  season: 3,
  episode: 9,
  runtime: '57 min',
  genres: 'Crime, Drama, Mystery, Thriller',
  director: 'Jeffrey Reiner, N/A',
  writer: 'Howard Gordon (developed for american television by), Alex Gansa (developed for american television by), Gideon Raff (based on the original Israeli series "Prisoners of War" by), Barbara Hall',
  actors: 'Claire Danes, Damian Lewis, Rupert Friend, Morena Baccarin',
  plot: 'Saul has found and rescued Brody and is now trying to help him recover from addiction. A task that proved to be a little challenging, so Saul turns to Carrie for help. She only agrees to help after she hears about Saul\'s new plan.',
  languages: 'English',
  country: 'USA',
  awards: 'N/A',
  poster: 'https://m.media-amazon.com/images/M/MV5BMTc0NDc2Nzg0MV5BMl5BanBnXkFtZTgwMzA2MzM2MDE@._V1_SX300.jpg',
  ratings: [{ Source: 'Internet Movie Database', Value: '8.6/10' }],
  metascore: 'N/A',
  rating: 8.6,
  votes: '2211',
  imdbid: 'tt2916312',
  seriesid: 'tt1796960',
  type: 'episode',
  response: 'True',
  series: true,
  imdburl: 'https://www.imdb.com/title/tt2916312',
};

const imdbApiSeriesWithNaN = {
  'actors': 'Dominic Purcell, Wentworth Miller, Amaury Nolasco',
  'directors': 'Bobby Roth',
  'genres': 'Action, Crime, Drama, Mystery, Thriller',
  'imdbID': 'tt0455275',
  'title': 'Prison Break',
  'totalSeasons': 'this is not a number but it should be',
  'type': 'series',
  'year': '2005',
};

describe('Data mapper', () => {
  describe('OpenSubtitles responses', () => {
    it('should parse to expected flat structure', () => {
      const parsed = mapper.parseOpenSubtitlesResponse(openSubtitlesData);
      // @ts-ignore
      expect(parsed.metadata).toBeUndefined();
      expect(parsed.goofs).toEqual(openSubtitlesData.metadata.goofs);
      expect(parsed.imdbID).toEqual(openSubtitlesData.metadata.imdbid);
      expect(parsed.osdbHash).toEqual(openSubtitlesData.moviehash);
      expect(parsed.tagline).toEqual(openSubtitlesData.metadata.tagline);
      expect(parsed.title).toEqual(openSubtitlesData.metadata.title);
      expect(parsed.trivia).toEqual(openSubtitlesData.metadata.trivia);
      expect(parsed.rating).toEqual(7.3);
      expect(parsed.type).toEqual(openSubtitlesData.type);
      expect(parsed.year).toEqual(openSubtitlesData.metadata.year);
      expect(parsed.votes).toEqual(openSubtitlesData.metadata.votes);
      expect(parsed.poster).toEqual(openSubtitlesData.metadata.cover);
      expect(parsed.actors).toEqual([
        'Dan Castellaneta',
        'Julie Kavner',
        'Nancy Cartwright',
        'Yeardley Smith',
        'Hank Azaria',
        'Harry Shearer',
        'Pamela Hayden',
        'Tress MacNeille',
        'Albert Brooks',
        'Karl Wiedergott',
        'Marcia Wallace',
        'Russi Taylor',
        'Maggie Roswell',
        'Phil Rosenthal',
        'Billie Joe Armstrong',
      ]);
    });
  });

  describe('imdbAPI responses', () => {
    describe('episodes', () => {
      it('should parse to expected flat structure', () => {
        const parsed = mapper.parseOMDbAPIEpisodeResponse(imdbApiEpisode);
        expect(parsed.actors).toEqual(['Claire Danes', 'Damian Lewis', 'Rupert Friend', 'Morena Baccarin']);
        expect(parsed.country).toEqual('USA');
        expect(parsed.directors).toEqual(['Jeffrey Reiner']);
        expect(parsed.episode).toEqual(9);
        expect(parsed.genres).toEqual(['Crime', 'Drama', 'Mystery', 'Thriller']);
        expect(parsed.plot).toEqual(imdbApiEpisode.plot);
        expect(parsed.imdbID).toEqual(imdbApiEpisode.imdbid);
        expect(parsed.poster).toEqual('https://m.media-amazon.com/images/M/MV5BMTc0NDc2Nzg0MV5BMl5BanBnXkFtZTgwMzA2MzM2MDE@._V1_SX300.jpg');
        expect(parsed.rated).toEqual('TV-MA');
        expect(parsed.rating).toEqual(8.6);
        expect(parsed.ratings).toEqual([{ Source: 'Internet Movie Database', Value: '8.6/10' }]);
        expect(parsed.released).toEqual('2013-11-23T11:00:00.000Z');
        expect(parsed.runtime).toEqual('57 min');
        expect(parsed.season).toEqual(imdbApiEpisode.season);
        expect(parsed.seriesIMDbID).toEqual(imdbApiEpisode.seriesid);
        expect(parsed.title).toEqual(imdbApiEpisode.title);
        expect(parsed.type).toEqual('episode');
        expect(parsed.votes).toEqual('2211');
        expect(typeof parsed.year).toBe('string');  
      });

      it('should remove N/A values', () => {
        const parsed = mapper.parseOMDbAPIEpisodeResponse(imdbApiEpisode);
        expect(parsed.awards).not.toBe('N/A');
      });
    });

    describe('series', () => {
      it('should remove NaN values', () => {
        const parsed = mapper.parseOMDbAPISeriesResponse(imdbApiSeriesWithNaN);
        expect(parsed.title).toBe('Prison Break');
        expect(parsed.totalSeasons).toBeUndefined();
      });
    });
  });
});
