/* eslint-disable @typescript-eslint/camelcase */
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

const omdbApiEpisode = {
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

const omdbApiSeriesWithNaN = {
  'actors': 'Dominic Purcell, Wentworth Miller, Amaury Nolasco',
  'directors': 'Bobby Roth',
  'genres': 'Action, Crime, Drama, Mystery, Thriller',
  'imdbID': 'tt0455275',
  'title': 'Prison Break',
  'totalSeasons': 'this is not a number but it should be',
  'type': 'series',
  'year': '2005',
};

// this response has been shortened by removing all but one object from each array of objects
const tmdbApiSeriesResponse = {
  'backdrop_path': '/kaUuV7mq8eJkLu4mI5iIt2vfxgq.jpg',
  'created_by': [
    {
      'id': 5174,
      'credit_id': '587a988e9251413eba00706e',
      'name': 'Barry Sonnenfeld',
      'gender': 2,
      'profile_path': '/n6y6vaAFfSqsJodgkwTxAey4NoG.jpg',
    },
  ],
  'episode_run_time': [
    45,
  ],
  'first_air_date': '2017-01-13',
  'genres': [
    {
      'id': 10759,
      'name': 'Action & Adventure',
    },
  ],
  'homepage': 'https://www.netflix.com/title/80050008',
  'id': 65294,
  'in_production': false,
  'languages': [
    'en',
  ],
  'last_air_date': '2019-01-01',
  'last_episode_to_air': {
    'air_date': '2019-01-01',
    'episode_number': 7,
    'id': 1624595,
    'name': 'The End',
    'overview': 'The final chapter takes the orphans to a deserted island: a place of lost lives, old stories and new beginnings. It all ends here.',
    'production_code': '',
    'season_number': 3,
    'still_path': '/ivzLVNFmKAQ8n7B1UBz2vGxuhSu.jpg',
    'vote_average': 7.2,
    'vote_count': 5,
  },
  'name': 'A Series of Unfortunate Events',
  'next_episode_to_air': null,
  'networks': [
    {
      'name': 'Netflix',
      'id': 213,
      'logo_path': '/wwemzKWzjKYJFfCeiB57q3r4Bcm.png',
      'origin_country': '',
    },
  ],
  'number_of_episodes': 25,
  'number_of_seasons': 3,
  'origin_country': [
    'US',
  ],
  'original_language': 'en',
  'original_name': 'A Series of Unfortunate Events',
  'overview': 'The orphaned Baudelaire children face trials, tribulations and the evil Count Olaf, all in their quest to uncover the secret of their parents\' death.',
  'popularity': 42.843,
  'poster_path': '/qg7WXAatXyQq6zO3SnWnRJEayeZ.jpg',
  'production_companies': [
    {
      'id': 39520,
      'logo_path': '/h5qMfjH9jaJ5835UGdq2PZQ1a33.png',
      'name': 'Take 5 Productions',
      'origin_country': 'CA',
    },
  ],
  'production_countries': [
    {
      'iso_3166_1': 'CA',
      'name': 'Canada',
    },
  ],
  'seasons': [
    {
      'air_date': '2017-01-13',
      'episode_count': 8,
      'id': 73892,
      'name': 'Season 1',
      'overview': '',
      'poster_path': '/sTtt875W3YbBnPooiPPmCvHienS.jpg',
      'season_number': 1,
    },
  ],
  'spoken_languages': [
    {
      'english_name': 'English',
      'iso_639_1': 'en',
      'name': 'English',
    },
  ],
  'status': 'Ended',
  'tagline': '',
  'type': 'Scripted',
  'vote_average': 7.3,
  'vote_count': 497,
  'images': {
    'backdrops': [
      {
        'aspect_ratio': 1.778,
        'height': 720,
        'iso_639_1': null,
        'file_path': '/kaUuV7mq8eJkLu4mI5iIt2vfxgq.jpg',
        'vote_average': 5.312,
        'vote_count': 1,
        'width': 1280,
      },
    ],
    'logos': [
      {
        'aspect_ratio': 9.076,
        'height': 131,
        'iso_639_1': 'en',
        'file_path': '/ewr9YgBxxrYA0jRRshUW44DrYfv.png',
        'vote_average': 5.312,
        'vote_count': 1,
        'width': 1189,
      },
    ],
    'posters': [
      {
        'aspect_ratio': 0.667,
        'height': 2700,
        'iso_639_1': 'en',
        'file_path': '/qg7WXAatXyQq6zO3SnWnRJEayeZ.jpg',
        'vote_average': 5.318,
        'vote_count': 3,
        'width': 1800,
      },
    ],
  },
  'external_ids': {
    'imdb_id': 'tt4834206',
    'freebase_mid': null,
    'freebase_id': null,
    'tvdb_id': 306304,
    'tvrage_id': null,
    'facebook_id': 'UnfortunateEventsNetflix',
    'instagram_id': null,
    'twitter_id': 'Unfortunate',
  },
  'credits': {
    'cast': [
      {
        'adult': false,
        'gender': 2,
        'id': 41686,
        'known_for_department': 'Acting',
        'name': 'Neil Patrick Harris',
        'original_name': 'Neil Patrick Harris',
        'popularity': 6.135,
        'profile_path': '/oyy0Enz4ZX8KYRYihgSgOA18Xc.jpg',
        'character': 'Count Olaf',
        'credit_id': '569a14fc9251414803000d3c',
        'order': 0,
      },
    ],
    'crew': [
      {
        'adult': false,
        'gender': 2,
        'id': 59722,
        'known_for_department': 'Writing',
        'name': 'Daniel Handler',
        'original_name': 'Daniel Handler',
        'popularity': 0.847,
        'profile_path': '/A83HnjYRdSlmuWybm8jgCuOCTt7.jpg',
        'credit_id': '5762af4bc3a3682fa70002dc',
        'department': 'Production',
        'job': 'Executive Producer',
      },
    ],
  },
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

  describe('OMDb API responses', () => {
    describe('episodes', () => {
      it('should parse to expected flat structure', () => {
        const parsed = mapper.parseOMDbAPIEpisodeResponse(omdbApiEpisode);
        expect(parsed.actors).toEqual(['Claire Danes', 'Damian Lewis', 'Rupert Friend', 'Morena Baccarin']);
        expect(parsed.country).toEqual('USA');
        expect(parsed.directors).toEqual(['Jeffrey Reiner']);
        expect(parsed.episode).toEqual(9);
        expect(parsed.genres).toEqual(['Crime', 'Drama', 'Mystery', 'Thriller']);
        expect(parsed.plot).toEqual(omdbApiEpisode.plot);
        expect(parsed.imdbID).toEqual(omdbApiEpisode.imdbid);
        expect(parsed.poster).toEqual('https://m.media-amazon.com/images/M/MV5BMTc0NDc2Nzg0MV5BMl5BanBnXkFtZTgwMzA2MzM2MDE@._V1_SX300.jpg');
        expect(parsed.rated).toEqual('TV-MA');
        expect(parsed.rating).toEqual(8.6);
        expect(parsed.ratings).toEqual([{ Source: 'Internet Movie Database', Value: '8.6/10' }]);
        expect(parsed.released).toEqual('2013-11-23T11:00:00.000Z');
        expect(parsed.runtime).toEqual('57 min');
        expect(parsed.season).toEqual(omdbApiEpisode.season);
        expect(parsed.seriesIMDbID).toEqual(omdbApiEpisode.seriesid);
        expect(parsed.title).toEqual(omdbApiEpisode.title);
        expect(parsed.type).toEqual('episode');
        expect(parsed.votes).toEqual('2211');
        expect(typeof parsed.year).toBe('string');  
      });

      it('should remove N/A values', () => {
        const parsed = mapper.parseOMDbAPIEpisodeResponse(omdbApiEpisode);
        expect(parsed.awards).not.toBe('N/A');
      });
    });

    describe('series', () => {
      it('should remove NaN values', () => {
        const parsed = mapper.parseOMDbAPISeriesResponse(omdbApiSeriesWithNaN);
        expect(parsed.title).toBe('Prison Break');
        expect(parsed.totalSeasons).toBeUndefined();
      });
    });
  });

  describe('TMDB API responses', () => {
    describe('series', () => {
      it('should parse as expected', () => {
        const parsed = mapper.parseTMDBAPISeriesResponse(tmdbApiSeriesResponse);
        expect(parsed.createdBy).toEqual([
          {
            id: 5174,
            credit_id: '587a988e9251413eba00706e',
            name: 'Barry Sonnenfeld',
            gender: 2,
            profile_path: '/n6y6vaAFfSqsJodgkwTxAey4NoG.jpg',
          },
        ]);
        expect(parsed.credits).toEqual({
          cast: [{
            'adult': false,
            'character': 'Count Olaf',
            'credit_id': '569a14fc9251414803000d3c',
            'gender': 2,
            'id': 41686,
            'known_for_department': 'Acting',
            'name': 'Neil Patrick Harris',
            'order': 0,
            'original_name': 'Neil Patrick Harris',
            'popularity': 6.135,
            'profile_path': '/oyy0Enz4ZX8KYRYihgSgOA18Xc.jpg',
          }],
          crew: [
            {
              'adult': false,
              'credit_id': '5762af4bc3a3682fa70002dc',
              'department': 'Production',
              'gender': 2,
              'id': 59722,
              'job': 'Executive Producer',
              'known_for_department': 'Writing',
              'name': 'Daniel Handler',
              'original_name': 'Daniel Handler',
              'popularity': 0.847,
              'profile_path': '/A83HnjYRdSlmuWybm8jgCuOCTt7.jpg',
            },
          ],
        });

        expect(parsed.imdbID).toBe('tt4834206');
        expect(parsed.externalIDs).toEqual({
          imdb_id: 'tt4834206',
          freebase_mid: null,
          freebase_id: null,
          tvdb_id: 306304,
          tvrage_id: null,
          facebook_id: 'UnfortunateEventsNetflix',
          instagram_id: null,
          twitter_id: 'Unfortunate',
        });
        expect(parsed.firstAirDate).toBe('2017-01-13');
        expect(parsed.genres).toEqual(['Action & Adventure']);
        expect(parsed.homepage).toBe('https://www.netflix.com/title/80050008');
        expect(parsed.tmdbID).toBe(65294);
        expect(parsed.images).toEqual({
          backdrops: [{
            'aspect_ratio': 1.778,
            'file_path': '/kaUuV7mq8eJkLu4mI5iIt2vfxgq.jpg',
            'height': 720,
            'iso_639_1': null,
            'vote_average': 5.312,
            'vote_count': 1,
            'width': 1280,
          }],
          logos: [{
            'aspect_ratio': 9.076,
            'file_path': '/ewr9YgBxxrYA0jRRshUW44DrYfv.png',
            'height': 131,
            'iso_639_1': 'en',
            'vote_average': 5.312,
            'vote_count': 1,
            'width': 1189,
          }],
          posters: [{
            'aspect_ratio': 0.667,
            'file_path': '/qg7WXAatXyQq6zO3SnWnRJEayeZ.jpg',
            'height': 2700,
            'iso_639_1': 'en',
            'vote_average': 5.318,
            'vote_count': 3,
            'width': 1800,
          }],
        });
        expect(parsed.inProduction).toBe(false);
        expect(parsed.languages).toEqual(['en']);
        expect(parsed.lastAirDate).toBe('2019-01-01');
        expect(parsed.title).toBe('A Series of Unfortunate Events');
        expect(parsed.networks).toEqual([
          {
            name: 'Netflix',
            id: 213,
            logo_path: '/wwemzKWzjKYJFfCeiB57q3r4Bcm.png',
            origin_country: '',
          },
        ]);
        expect(parsed.numberOfEpisodes).toBe(25);
        expect(parsed.numberOfSeasons).toBe(3);
        expect(parsed.originCountry).toEqual(['US']);
        expect(parsed.originalLanguage).toBe('en');
        expect(parsed.plot).toBe('The orphaned Baudelaire children face trials, tribulations and the evil Count Olaf, all in their quest to uncover the secret of their parents\' death.');
        expect(parsed.productionCompanies).toEqual([
          {
            id: 39520,
            logo_path: '/h5qMfjH9jaJ5835UGdq2PZQ1a33.png',
            name: 'Take 5 Productions',
            origin_country: 'CA',
          },
        ]);
        expect(parsed.productionCountries).toEqual([{ iso_3166_1: 'CA', name: 'Canada' }]);
        expect(parsed.seasons).toEqual([
          {
            air_date: '2017-01-13',
            episode_count: 8,
            id: 73892,
            name: 'Season 1',
            overview: '',
            poster_path: '/sTtt875W3YbBnPooiPPmCvHienS.jpg',
            season_number: 1,
          },
        ]);
        expect(parsed.spokenLanguages).toEqual([{ english_name: 'English', iso_639_1: 'en', name: 'English' }]);
        expect(parsed.status).toBe('Ended');
        expect(parsed.tagline).toBe('');
        expect(parsed.seriesType).toBe('Scripted');
      });
    });
  });
});
