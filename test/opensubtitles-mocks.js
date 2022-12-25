/* eslint-disable */ 
const nock = require('nock');

//subtitles
nock('https://local.opensubtitles.com', { 'encodedQueryParams': true })
  .persist()
  .get('/api/v1/subtitles')
  .query({moviehash_match: 'only', moviehash: '0f0f4c9f3416e24f', query: 'Interstellar'})
  .reply(200,
    {"total_pages":1,"total_count":34,"per_page":60,"page":1,"data":[{"id":"1007788","type":"subtitle","attributes":{"subtitle_id":"1007788","language":"en","download_count":1791802,"new_download_count":2986,"hearing_impaired":false,"hd":true,"fps":23.976,"votes":7,"ratings":3.4,"from_trusted":true,"foreign_parts_only":false,"upload_date":"2015-03-15T06:42:08Z","ai_translated":false,"machine_translated":false,"release":"Interstellar.2014.720p.BluRay.x264-DAA","comments":"","legacy_subtitle_id":6080089,"uploader":{"uploader_id":63405,"name":"Luis-subs","rank":"Trusted member"},"feature_details":{"feature_id":594208,"feature_type":"Movie","year":2014,"title":"Interstellar","movie_name":"2014 - Interstellar","imdb_id":816692,"tmdb_id":157336},"url":"https://www.opensubtitles.com/en/subtitles/legacy/6080089","related_links":[{"label":"All subtitles for Interstellar","url":"https://www.opensubtitles.com/en/movies/2014-interstellar","img_url":"https://s9.osdb.link/features/8/0/2/594208.jpg"}],"files":[{"file_id":1094041,"cd_number":1,"file_name":"Interstellar.2014.720p.BluRay.x264-DAA"}],"moviehash_match":true}},{"id":"1008943","type":"subtitle","attributes":{"subtitle_id":"1008943","language":"en","download_count":462445,"new_download_count":525,"hearing_impaired":false,"hd":true,"fps":23.976,"votes":7,"ratings":8.1,"from_trusted":true,"foreign_parts_only":false,"upload_date":"2015-03-15T10:25:01Z","ai_translated":false,"machine_translated":false,"release":"Interstellar.2014.720p.BluRay.x264-DAA","comments":"HI Removed - Perfect Sync and Corrected - For All Blu-Ray.","legacy_subtitle_id":6080182,"uploader":{"uploader_id":63365,"name":"GoldenBeard","rank":"Trusted member"},"feature_details":{"feature_id":594208,"feature_type":"Movie","year":2014,"title":"Interstellar","movie_name":"2014 - Interstellar","imdb_id":816692,"tmdb_id":157336},"url":"https://www.opensubtitles.com/en/subtitles/legacy/6080182","related_links":[{"label":"All subtitles for Interstellar","url":"https://www.opensubtitles.com/en/movies/2014-interstellar","img_url":"https://s9.osdb.link/features/8/0/2/594208.jpg"}],"files":[{"file_id":1095216,"cd_number":1,"file_name":"Interstellar.2014.720p.BluRay.x264-DAA"}],"moviehash_match":true}}]}
  );

nock('https://local.opensubtitles.com', { 'encodedQueryParams': true })
  .persist()
  .get('/api/v1/subtitles')
  .query({moviehash_match: 'only', moviehash: '35acba68a9dcfc8f'})
  .reply(200,
    {"total_pages":1,"total_count":40,"per_page":60,"page":1,"data":[{"id":"1428497","type":"subtitle","attributes":{"subtitle_id":"1428497","language":"en","download_count":88385,"new_download_count":257,"hearing_impaired":false,"hd":false,"fps":25,"votes":1,"ratings":7,"from_trusted":false,"foreign_parts_only":false,"upload_date":"2017-05-31T08:47:22Z","ai_translated":false,"machine_translated":false,"release":"Prison.Break.S05E09.HDTV.x264-KILLERS","comments":"█►HI Removed ; Synced and corrected by VitoSilans - SEASON FINALE◄█","legacy_subtitle_id":6998390,"uploader":{"uploader_id":79098,"name":"JOKER-74-AHMED","rank":"Read Only Member"},"feature_details":{"feature_id":25747,"feature_type":"Episode","year":2017,"title":"\"Prison Break\" Behind the Eyes","movie_name":"Prison Break - S05E09  \"Prison Break\" Behind the Eyes","imdb_id":5538198,"tmdb_id":1303881,"season_number":5,"episode_number":9,"parent_imdb_id":455275,"parent_title":"Prison Break","parent_tmdb_id":2288,"parent_feature_id":7257},"url":"https://www.opensubtitles.com/en/subtitles/legacy/6998390","related_links":[{"label":"All subtitles for Tv Show Prison Break","url":"https://www.opensubtitles.com/en/features/redirect/7257","img_url":"https://s9.osdb.link/features/7/4/7/25747.jpg"},{"label":"All subtitles for Episode \"Prison Break\" Behind the Eyes","url":"https://www.opensubtitles.com/en/features/redirect/25747"}],"files":[{"file_id":1522938,"cd_number":1,"file_name":"Prison.Break.S05E09.HDTV.x264-KILLERS"}],"moviehash_match":true}},{"id":"1430355","type":"subtitle","attributes":{"subtitle_id":"1430355","language":"en","download_count":59366,"new_download_count":168,"hearing_impaired":false,"hd":true,"fps":23.976,"votes":2,"ratings":4.5,"from_trusted":false,"foreign_parts_only":false,"upload_date":"2015-12-09T11:44:46Z","ai_translated":false,"machine_translated":false,"release":"Prison.Break.The.Final.Break.2009.720p.BluRay.x264-CiNEFiLE","comments":"","legacy_subtitle_id":6417336,"uploader":{"uploader_id":3282,"name":"os-auto","rank":"Application Developers"},"feature_details":{"feature_id":25748,"feature_type":"Episode","year":2017,"title":"\"Prison Break\" Ogygia","movie_name":"Prison Break - S05E01  \"Prison Break\" Ogygia","imdb_id":5537374,"tmdb_id":1256904,"season_number":5,"episode_number":1,"parent_imdb_id":455275,"parent_title":"Prison Break","parent_tmdb_id":2288,"parent_feature_id":7257},"url":"https://www.opensubtitles.com/en/subtitles/legacy/6417336","related_links":[{"label":"All subtitles for Tv Show Prison Break","url":"https://www.opensubtitles.com/en/features/redirect/7257","img_url":"https://s9.osdb.link/features/8/4/7/25748.jpg"},{"label":"All subtitles for Episode \"Prison Break\" Ogygia","url":"https://www.opensubtitles.com/en/features/redirect/25748"}],"files":[{"file_id":1524809,"cd_number":1,"file_name":"Prison.Break.The.Final.Break.2009.720p.BluRay.x264-CiNEFiLE"}],"moviehash_match":true}},{"id":"1430340","type":"subtitle","attributes":{"subtitle_id":"1430340","language":"nl","download_count":26651,"new_download_count":36,"hearing_impaired":false,"hd":false,"fps":23.976,"votes":3,"ratings":10,"from_trusted":false,"foreign_parts_only":false,"upload_date":"2017-05-31T23:41:48Z","ai_translated":false,"machine_translated":false,"release":"Prison.Break.S05E09.HDTV.x264-KILLERS","comments":"Retail sub","legacy_subtitle_id":6999174,"uploader":{"uploader_id":75969,"name":"AchtAchtAcht","rank":"Trusted member"},"feature_details":{"feature_id":25747,"feature_type":"Episode","year":2017,"title":"\"Prison Break\" Behind the Eyes","movie_name":"Prison Break - S05E09  \"Prison Break\" Behind the Eyes","imdb_id":5538198,"tmdb_id":1303881,"season_number":5,"episode_number":9,"parent_imdb_id":455275,"parent_title":"Prison Break","parent_tmdb_id":2288,"parent_feature_id":7257},"url":"https://www.opensubtitles.com/nl/subtitles/legacy/6999174","related_links":[{"label":"All subtitles for Tv Show Prison Break","url":"https://www.opensubtitles.com/nl/features/redirect/7257","img_url":"https://s9.osdb.link/features/7/4/7/25747.jpg"},{"label":"All subtitles for Episode \"Prison Break\" Behind the Eyes","url":"https://www.opensubtitles.com/nl/features/redirect/25747"}],"files":[{"file_id":1524793,"cd_number":1,"file_name":"Prison.Break.S05E09.HDTV.x264-KILLERS"}],"moviehash_match":true}}]}
  );

nock('https://local.opensubtitles.com', { 'encodedQueryParams': true })
  .persist()
  .get('/api/v1/subtitles')
  .query({moviehash_match: 'only', moviehash: '35acba68a9dcfc8f', query: 'Behind the Eyes', season_number: 5, episode_number: 9, year: 2017})
  .reply(200,
    {"total_pages":1,"total_count":25,"per_page":60,"page":1,"data":[{"id":"1428497","type":"subtitle","attributes":{"subtitle_id":"1428497","language":"en","download_count":88385,"new_download_count":257,"hearing_impaired":false,"hd":false,"fps":25,"votes":1,"ratings":7,"from_trusted":false,"foreign_parts_only":false,"upload_date":"2017-05-31T08:47:22Z","ai_translated":false,"machine_translated":false,"release":"Prison.Break.S05E09.HDTV.x264-KILLERS","comments":"█►HI Removed ; Synced and corrected by VitoSilans - SEASON FINALE◄█","legacy_subtitle_id":6998390,"uploader":{"uploader_id":79098,"name":"JOKER-74-AHMED","rank":"Read Only Member"},"feature_details":{"feature_id":25747,"feature_type":"Episode","year":2017,"title":"\"Prison Break\" Behind the Eyes","movie_name":"Prison Break - S05E09  \"Prison Break\" Behind the Eyes","imdb_id":5538198,"tmdb_id":1303881,"season_number":5,"episode_number":9,"parent_imdb_id":455275,"parent_title":"Prison Break","parent_tmdb_id":2288,"parent_feature_id":7257},"url":"https://www.opensubtitles.com/en/subtitles/legacy/6998390","related_links":[{"label":"All subtitles for Tv Show Prison Break","url":"https://www.opensubtitles.com/en/features/redirect/7257","img_url":"https://s9.osdb.link/features/7/4/7/25747.jpg"},{"label":"All subtitles for Episode \"Prison Break\" Behind the Eyes","url":"https://www.opensubtitles.com/en/features/redirect/25747"}],"files":[{"file_id":1522938,"cd_number":1,"file_name":"Prison.Break.S05E09.HDTV.x264-KILLERS"}],"moviehash_match":true}},{"id":"1430340","type":"subtitle","attributes":{"subtitle_id":"1430340","language":"nl","download_count":26651,"new_download_count":36,"hearing_impaired":false,"hd":false,"fps":23.976,"votes":3,"ratings":10,"from_trusted":false,"foreign_parts_only":false,"upload_date":"2017-05-31T23:41:48Z","ai_translated":false,"machine_translated":false,"release":"Prison.Break.S05E09.HDTV.x264-KILLERS","comments":"Retail sub","legacy_subtitle_id":6999174,"uploader":{"uploader_id":75969,"name":"AchtAchtAcht","rank":"Trusted member"},"feature_details":{"feature_id":25747,"feature_type":"Episode","year":2017,"title":"\"Prison Break\" Behind the Eyes","movie_name":"Prison Break - S05E09  \"Prison Break\" Behind the Eyes","imdb_id":5538198,"tmdb_id":1303881,"season_number":5,"episode_number":9,"parent_imdb_id":455275,"parent_title":"Prison Break","parent_tmdb_id":2288,"parent_feature_id":7257},"url":"https://www.opensubtitles.com/nl/subtitles/legacy/6999174","related_links":[{"label":"All subtitles for Tv Show Prison Break","url":"https://www.opensubtitles.com/nl/features/redirect/7257","img_url":"https://s9.osdb.link/features/7/4/7/25747.jpg"},{"label":"All subtitles for Episode \"Prison Break\" Behind the Eyes","url":"https://www.opensubtitles.com/nl/features/redirect/25747"}],"files":[{"file_id":1524793,"cd_number":1,"file_name":"Prison.Break.S05E09.HDTV.x264-KILLERS"}],"moviehash_match":true}}]}
  );
nock('https://local.opensubtitles.com', { 'encodedQueryParams': true })
  .persist()
  .get('/api/v1/subtitles')
  .query({moviehash_match: 'only', moviehash: 'de334f38f153fb6f', query: 'Avatar: The Last Airbender', season_number: 3, year: 2005})
  .reply(200,
    {"total_pages":0,"total_count":0,"per_page":60,"page":1,"data":[]}
  );

//features
nock('https://local.opensubtitles.com', { 'encodedQueryParams': true })
  .persist()
  .get('/api/v1/features')
  .query({feature_id: 594208})
  .reply(200,
    {"data":[{"id":"594208","type":"feature","attributes":{"title":"Interstellar","original_title":"Interstellar","year":"2014","subtitles_counts":{"en":56,"pt-BR":55,"pt-PT":29,"es":23,"ar":20,"el":20,"pl":20,"zh-CN":19,"ro":18,"hu":16,"cs":15,"hr":15,"tr":15,"ko":14,"sr":14,"it":12,"sl":12,"bs":11,"fi":11,"da":10,"nl":10,"fr":10,"id":10,"bg":9,"hi":8,"he":7,"ru":7,"et":6,"vi":6,"zh-TW":6,"bn":5,"fa":5,"de":4,"ml":4,"ms":4,"sk":4,"sv":4,"ta":4,"th":4,"ja":3,"ku":3,"mk":3,"no":3,"ur":3,"my":2,"lt":2,"sq":1,"eu":1,"is":1,"lv":1,"si":1,"te":1,"tl":1,"ze":1},"subtitles_count":550,"seasons_count":0,"parent_title":"","season_number":0,"episode_number":null,"imdb_id":816692,"tmdb_id":157336,"parent_imdb_id":null,"feature_id":"594208","title_aka":["بين النجوم","Ulduzlararasi","Интерстелар","Interstellar","Interestelar","Tähtedevaheline","بین ستاره‌ای","בין כוכבים","Csillagok között","インターステ ラー","인터스텔라","Tarp žvaigždžių","Interstellar: Călătorind prin univers","Интерстеллар","Medzvezdje","Међузвездани","อินเตอร์สเตลลาร์ ทะยานดาวกู้โลก","Yıldızlararası","星際效應","Інтерстеллар","Du Hành Liên Sao","星际穿越"],"feature_type":"Movie","url":"https://www.opensubtitles.com/en/movies/2014-interstellar","img_url":"https://s9.osdb.link/features/8/0/2/594208.jpg","seasons":[]}}]}
  );
nock('https://local.opensubtitles.com', { 'encodedQueryParams': true })
  .persist()
  .get('/api/v1/features')
  .query({feature_id: 25747})
  .reply(200,
    {"data":[{"id":"25747","type":"feature","attributes":{"title":"\"Prison Break\" Behind the Eyes","original_title":null,"year":"2017","subtitles_counts":{"en":13,"it":9,"pt-BR":7,"ar":5,"hr":5,"tr":5,"nl":4,"fa":4,"he":3,"hu":3,"pl":3,"pt-PT":3,"sr":3,"sv":3,"vi":3,"ro":3,"bs":2,"cs":2,"da":2,"fi":2,"fr":2,"el":2,"ms":2,"sl":2,"es":2,"bn":1,"et":1,"de":1,"no":1,"ru":1,"si":1},"subtitles_count":101,"seasons_count":0,"parent_title":"Prison Break","season_number":5,"episode_number":9,"imdb_id":5538198,"tmdb_id":1303881,"parent_imdb_id":455275,"feature_id":"25747","title_aka":["\"Prison Break\" Behind the Eyes"],"feature_type":"Episode","url":"https://www.opensubtitles.com/en/tvshows/2005-prison-break/seasons/5/episodes/9-prison-break-behind-the-eyes","img_url":"https://s9.osdb.link/features/7/4/7/25747.jpg","seasons":[]}}]}
  );
