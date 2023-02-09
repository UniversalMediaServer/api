import { mapper } from '../../src/utils/data-mapper';

const openSubtitlesData = {
  subcount: '7',
  added: false,
  metadata: {
    imdbid: 't0462538', // intentionally missing a "t"
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
  imdbid: 't2916312', // intentionally missing a "t"
  type: 'episode',
  response: 'True',
  series: true,
  imdburl: 'https://www.imdb.com/title/tt2916312',
};

const omdbApiSeries = {
  ratings: [{ source: 'Internet Movie Database', value: '8.3/10' }],
  title: 'Prison Break',
  year: 0,
  _yearData: '2005–2017',
  rated: 'TV-14',
  released: new Date('2005-08-28T12:00:00.000Z'),
  runtime: '44 min',
  genres: 'Action, Crime, Drama',
  director: 'N/A',
  writer: 'Paul T. Scheuring',
  actors: 'Dominic Purcell, Wentworth Miller, Amaury Nolasco',
  plot: 'An innocent man is framed for the homicide of the Vice President\'s brother and scheduled to be executed at a super-max penitentiary, thus it\'s up to his younger brother to save him with his genius scheme: install himself in the same prison by holding up a bank and, as the final month ticks away, launch the escape plan step-by-step to break the both of them out, with his full-body tattoo acting as his guide; a tattoo which hides the layout of the prison facility and necessary clues vital to the escape.',
  languages: 'English, Arabic, Spanish',
  country: 'United Kingdom, United States',
  awards: 'Nominated for 1 Primetime Emmy. 8 wins & 32 nominations total',
  poster: 'https://m.media-amazon.com/images/M/MV5BMTg3NTkwNzAxOF5BMl5BanBnXkFtZTcwMjM1NjI5MQ@@._V1_SX300.jpg',
  metascore: 'N/A',
  rating: 8.3,
  votes: '497,403',
  imdbid: 'tt0455275',
  type: 'series',
  boxoffice: undefined,
  production: undefined,
  website: undefined,
  name: 'Prison Break',
  series: true,
  imdburl: 'https://www.imdb.com/title/tt0455275',
  _episodes: [],
  start_year: 2005,
  end_year: undefined,
  totalseasons: 5,
};

const tmdbApiMovieResponse = {
  'adult': false,
  'backdrop_path': '/2KjPXUYDoSbAtIQGjbEIcX6b7x5.jpg',
  'belongs_to_collection': {
    'id':422837,
    'name':'Blade Runner Collection',
    'poster_path':'/qTcATCpiFDcgY8snQIfS2j0bFP7.jpg',
    'backdrop_path':'/bSHZIvLoPBWyGLeiAudN1mXdvQX.jpg'
   },
  'budget': 15000000,
  'genres': [
    {
      'id': 12,
      'name': 'Adventure',
    },
    {
      'id': 878,
      'name': 'Science Fiction',
    },
    {
      'id': 28,
      'name': 'Action',
    },
  ],
  'homepage': '',
  'id': 11884,
  'imdb_id': 'tt0087597',
  'original_language': 'en',
  'original_title': 'The Last Starfighter',
  'overview': 'A video game expert Alex Rogan finds himself transported to another planet after conquering The Last Starfighter video game only to find out it was just a test. He was recruited to join the team of best Starfighters to defend their world from the attack.',
  'popularity': 8.993,
  'poster_path': '/an1H0DPADLDlEsiUy8vE9AWqrhm.jpg',
  'production_companies': [
    {
      'id': 33,
      'logo_path': '/8lvHyhjr8oUKOOy2dKXoALWKdp0.png',
      'name': 'Universal Pictures',
      'origin_country': 'US',
    },
  ],
  'production_countries': [
    {
      'iso_3166_1': 'US',
      'name': 'United States of America',
    },
  ],
  'release_date': '1984-07-13',
  'revenue': 28733290,
  'runtime': 101,
  'spoken_languages': [
    {
      'english_name': 'English',
      'iso_639_1': 'en',
      'name': 'English',
    },
  ],
  'status': 'Released',
  'tagline': 'He didn\'t find his dreams... his dreams found him.',
  'title': 'The Last Starfighter',
  'video': false,
  'vote_average': 6.6,
  'vote_count': 495,
  'images': {
    'backdrops': [
      {
        'aspect_ratio': 1.778,
        'height': 1440,
        'iso_639_1': null,
        'file_path': '/2KjPXUYDoSbAtIQGjbEIcX6b7x5.jpg',
        'vote_average': 5.456,
        'vote_count': 5,
        'width': 2560,
      },
    ],
    'logos': [],
    'posters': [
      {
        'aspect_ratio': 0.667,
        'height': 1500,
        'iso_639_1': 'en',
        'file_path': '/an1H0DPADLDlEsiUy8vE9AWqrhm.jpg',
        'vote_average': 5.138,
        'vote_count': 8,
        'width': 1000,
      },
    ],
  },
  'external_ids': {
    'imdb_id': 'tt0087597',
    'facebook_id': null,
    'instagram_id': null,
    'twitter_id': null,
  },
  'credits': {
    'cast': [
      {
        'adult': false,
        'gender': 2,
        'id': 16213,
        'known_for_department': 'Acting',
        'name': 'Lance Guest',
        'original_name': 'Lance Guest',
        'popularity': 1.285,
        'profile_path': '/rfLT0dxqWcAsN5rcEia6tHt2UpW.jpg',
        'cast_id': 1,
        'character': 'Alex Rogan',
        'credit_id': '52fe449a9251416c7503a87b',
        'order': 0,
      },
    ],
    'crew': [
      {
        'adult': false,
        'gender': 0,
        'id': 375,
        'known_for_department': 'Sound',
        'name': 'Bub Asman',
        'original_name': 'Bub Asman',
        'popularity': 1.286,
        'profile_path': null,
        'credit_id': '5d5ec71ef263ba001495033f',
        'department': 'Sound',
        'job': 'Sound Editor',
      },
    ],
  },
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
      // @ts-expect-error metadata is supposed to not exist
      expect(parsed.metadata).toBeUndefined();
      expect(parsed.goofs).toEqual(openSubtitlesData.metadata.goofs);

      // Verify we have added a "t" to make the IMDb ID valid
      expect(parsed.imdbID).toEqual('t' + openSubtitlesData.metadata.imdbid);

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
        expect(parsed.imdbID).toEqual('t' + omdbApiEpisode.imdbid);
        expect(parsed.poster).toEqual('https://m.media-amazon.com/images/M/MV5BMTc0NDc2Nzg0MV5BMl5BanBnXkFtZTgwMzA2MzM2MDE@._V1_SX300.jpg');
        expect(parsed.rated).toEqual('TV-MA');
        expect(parsed.rating).toEqual(8.6);
        expect(parsed.ratings).toEqual([{ Source: 'Internet Movie Database', Value: '8.6/10' }]);
        expect(parsed.released).toEqual('2013-11-23T11:00:00.000Z');
        expect(parsed.runtime).toEqual('57 min');
        expect(parsed.season).toEqual(omdbApiEpisode.season);
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
      it('should parse as expected', () => {
        const parsed = mapper.parseOMDbAPISeriesResponse(omdbApiSeries);
        expect(parsed.actors).toEqual(['Dominic Purcell', 'Wentworth Miller', 'Amaury Nolasco']),
        expect(parsed.awards).toBe('Nominated for 1 Primetime Emmy. 8 wins & 32 nominations total'),
        expect(parsed.country).toBe('United Kingdom, United States'),
        expect(parsed.directors).toEqual([]),
        expect(parsed.imdbID).toBe('tt0455275'),
        expect(parsed.title).toBe('Prison Break'),
        expect(parsed.genres).toEqual(['Action', 'Crime', 'Drama']),
        expect(parsed.plot).toBe('An innocent man is framed for the homicide of the Vice President\'s brother and scheduled to be executed at a super-max penitentiary, thus it\'s up to his younger brother to save him with his genius scheme: install himself in the same prison by holding up a bank and, as the final month ticks away, launch the escape plan step-by-step to break the both of them out, with his full-body tattoo acting as his guide; a tattoo which hides the layout of the prison facility and necessary clues vital to the escape.'),
        expect(parsed.poster).toBe('https://m.media-amazon.com/images/M/MV5BMTg3NTkwNzAxOF5BMl5BanBnXkFtZTcwMjM1NjI5MQ@@._V1_SX300.jpg'),
        expect(parsed.rated).toBe('TV-14'),
        expect(parsed.rating).toBe(8.3),
        expect(parsed.ratings).toEqual([{ Source: 'Internet Movie Database', Value: '8.3/10' }]),
        expect(parsed.startYear).toBe('2005'),
        expect(parsed.year).toBe('2005'),
        expect(parsed.totalSeasons).toBe(5),
        expect(parsed.type).toBe('series'),
        expect(parsed.votes).toBe('497,403');
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
        expect(parsed.genres).toEqual(['Action & Adventure']);
        expect(parsed.homepage).toBe('https://www.netflix.com/title/80050008');
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
        expect(parsed.released).toBe('2017-01-13');
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
        expect(parsed.seriesType).toBe('Scripted');
        expect(parsed.spokenLanguages).toEqual([{ english_name: 'English', iso_639_1: 'en', name: 'English' }]);
        expect(parsed.startYear).toBe('2017');
        expect(parsed.status).toBe('Ended');
        expect(parsed.tagline).toBe('');
        expect(parsed.tmdbID).toBe(65294);
        expect(parsed.totalSeasons).toBe(3);
        expect(parsed.type).toBe('series');
        expect(parsed.year).toBe('2017');
      });
    });
    describe('movies', () => {
      it('should parse as expected', () => {
        const parsed = mapper.parseTMDBAPIMovieResponse(tmdbApiMovieResponse);

        expect(parsed.budget).toBe(15000000);
        expect(parsed.collectionTmdbID).toBe(422837);
        expect(parsed.credits).toEqual({
          cast: [{
            'adult': false,
            'cast_id': 1,
            'character': 'Alex Rogan',
            'credit_id': '52fe449a9251416c7503a87b',
            'gender': 2,
            'id': 16213,
            'known_for_department': 'Acting',
            'name': 'Lance Guest',
            'order': 0,
            'original_name': 'Lance Guest',
            'popularity': 1.285,
            'profile_path': '/rfLT0dxqWcAsN5rcEia6tHt2UpW.jpg',
          }],
          crew: [{
            'adult': false,
            'credit_id': '5d5ec71ef263ba001495033f',
            'department': 'Sound',
            'gender': 0,
            'id': 375,
            'job': 'Sound Editor',
            'known_for_department': 'Sound',
            'name': 'Bub Asman',
            'original_name': 'Bub Asman',
            'popularity': 1.286,
            'profile_path': null,
          }],
        });
        expect(parsed.externalIDs).toEqual({
          imdb_id: 'tt0087597',
          facebook_id: null,
          instagram_id: null,
          twitter_id: null,
        });
        expect(parsed.genres).toEqual(['Adventure', 'Science Fiction', 'Action']);
        expect(parsed.tmdbID).toBe(11884);
        expect(parsed.images).toEqual({
          backdrops: [{
            'aspect_ratio': 1.778,
            'file_path': '/2KjPXUYDoSbAtIQGjbEIcX6b7x5.jpg',
            'height': 1440,
            'iso_639_1': null,
            'vote_average': 5.456,
            'vote_count': 5,
            'width': 2560,
          }],
          logos: [],
          posters: [{
            'aspect_ratio': 0.667,
            'file_path': '/an1H0DPADLDlEsiUy8vE9AWqrhm.jpg',
            'height': 1500,
            'iso_639_1': 'en',
            'vote_average': 5.138,
            'vote_count': 8,
            'width': 1000,
          }],
        });
        expect(parsed.imdbID).toBe('tt0087597');
        expect(parsed.originalLanguage).toBe('en');
        expect(parsed.originalTitle).toBe('The Last Starfighter');
        expect(parsed.plot).toBe('A video game expert Alex Rogan finds himself transported to another planet after conquering The Last Starfighter video game only to find out it was just a test. He was recruited to join the team of best Starfighters to defend their world from the attack.');
        expect(parsed.productionCompanies).toEqual([{
          id: 33,
          logo_path: '/8lvHyhjr8oUKOOy2dKXoALWKdp0.png',
          name: 'Universal Pictures',
          origin_country: 'US',
        }]);
        expect(parsed.year).toBe('1984');
        expect(parsed.released).toBe('1984-07-13');
        expect(parsed.revenue).toBe(28733290);
        expect(parsed.runtime).toBe(101);
        expect(parsed.spokenLanguages).toEqual([{ english_name: 'English', iso_639_1: 'en', name: 'English' }]);
        expect(parsed.tagline).toBe('He didn\'t find his dreams... his dreams found him.');
        expect(parsed.title).toBe('The Last Starfighter');
        expect(parsed.type).toBe('movie');
      });
    });
  });
});
