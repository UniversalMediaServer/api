import { mapper } from '../../src/utils/data-mapper';

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
        'department': 'Directing',
        'job': 'Director',
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

describe('Data mapper for TMDB API responses', () => {
  describe('series', () => {
    it('should parse as expected', () => {
      const parsed = mapper.parseTMDBAPISeriesResponse(tmdbApiSeriesResponse);
      expect(parsed.actors).toEqual(['Neil Patrick Harris']);
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

      expect(parsed.actors).toBeDefined();
      expect(parsed.actors[0]).toBe('Lance Guest');
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
          'department': 'Directing',
          'gender': 0,
          'id': 375,
          'job': 'Director', // changed this from the actual result in order to test the directors array
          'known_for_department': 'Sound',
          'name': 'Bub Asman',
          'original_name': 'Bub Asman',
          'popularity': 1.286,
          'profile_path': null,
        }],
      });
      expect(parsed.directors).toBeDefined();
      expect(parsed.directors[0]).toBe('Bub Asman');
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
