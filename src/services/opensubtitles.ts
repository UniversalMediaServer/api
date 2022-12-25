/*
 * This file is part of Universal Media Server, based on PS3 Media Server.
 *
 * This program is a free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; version 2 of the License only.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/*
 * Opensubtitles REST API.
 * api.opensubtitles.com
*/
export class OpensubtitlesApi {
  private apiKey: string;
  private requests: Array<QueueItem> = [];
  private requesting = false;
  public baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.opensubtitles.com/api/v1/') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Processes the next request in the request queue
   */
  private dequeue(): void {
    if (this.requesting) {
      return;
    }

    const request = this.requests.shift();

    if (!request) {
      return;
    }

    this.requesting = true;

    request
      .promiseGenerator()
      .then(request.resolve)
      .catch(request.reject)
      .finally(() => {
        this.requesting = false;
        this.dequeue();
      });
  }

  /**
   * Performs the request to the server
   */
  private makeRequest<T>(
    method: HttpMethod,
    endpoint: string,
    params = {},
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<T> {

    const request: AxiosRequestConfig = {
      method,
      url: this.baseUrl + endpoint,
      headers: {'Api-Key' : this.apiKey, 'Accept-Encoding': '*', 'Content-Type': 'application/json'},
      ...(method === HttpMethod.Get && { params: params }),
      ...(method !== HttpMethod.Get && { data: params }),
      ...axiosConfig,
    };

    // Push the request to the queue
    return new Promise((resolve, reject) => {
      this.requests.push({
        promiseGenerator: () => axios.request(request).then((res) => res.data),
        resolve,
        reject,
      });

      this.dequeue();
    });
  }

  subtitles(params?: SubtitlesRequestParams, axiosConfig?: AxiosRequestConfig): Promise<SubtitlesResponse> {
    return this.makeRequest<SubtitlesResponse>(HttpMethod.Get, 'subtitles', params, axiosConfig);
  }

  features(params?: FeaturesRequestParams, axiosConfig?: AxiosRequestConfig): Promise<FeaturesResponse> {
    return this.makeRequest<FeaturesResponse>(HttpMethod.Get, 'features', params, axiosConfig);
  }

}

export enum HttpMethod {
  Get = 'get',
  Post = 'post',
  Put = 'put',
  Delete = 'delete',
}

export interface QueueItem {
  promiseGenerator: () => Promise<AxiosResponse>
  // eslint-disable-next-line
  resolve: (value: any) => void
  reject: (value: any) => void
}

export interface SubtitlesRequestParams {
  /**
   * exclude, include (default: exclude)
   */
  ai_translated?: string;
  /**
   * For Tvshows
   */
  episode_number?: number;
  /**
   * exclude, include, only (default: include)
   */
  foreign_parts_only?: string;
  /**
   * exclude, include, only (default: include)
   */
  hearing_impaired?: string;
  /**
   * ID of the movie or episode
   */
  id?: number;
  /**
   * IMDB ID of the movie or episode
   */
  imdb_id?: number;
  /**
   * Language code(s), coma separated (en,fr)
   */
  languages?: string;
  /**
   * exclude, include (default: exclude)
   */
  machine_translated?: string;
  /**
   * Moviehash of the movie
   * >= 16 characters<= 16 characters
   * Match pattern: ^[a-f0-9]{16}$
   */
  moviehash?: string;
  /**
   * include, only (default: include)
   */
  moviehash_match?: string;
  /**
   * Order of the returned results, accept any of above fields
   */
  order_by?: string;
  /**
   * Order direction of the returned results (asc,desc)
   */
  order_direction?: string;
  /**
   * Results page to display
   */
  page?: number;
  /**
   * For Tvshows
   */
  parent_feature_id?: number;
  /**
   * For Tvshows
   */
  parent_imdb_id?: number;
  /**
   * For Tvshows
   */
  parent_tmdb_id?: number;
  /**
   * file name or text search
   */
  query?: string;
  /**
   * For Tvshows
   */
  season_number?: number;
  /**
   * TMDB ID of the movie or episode
   */
  tmdb_id?: number;
  /**
   * include, only (default: include)
   */
  trusted_sources?: string;
  /**
   * movie, episode or all, (default: all)
   */
  type?: string;
  /**
   * To be used alone - for user uploads listing
   */
  user_id?: number;
  /**
   * Filter by movie/episode year
   */
  year?: number;
}
export interface SubtitlesResponse extends Response {
  total_pages: number;
  total_count: number;
  page: number;
  data: Array<SubtitlesResponseData>;
}
export interface SubtitlesResponseData {
  id: string;
  type: string;
  attributes: SubtitlesResponseDataAttributes;
}
export interface SubtitlesResponseDataAttributes {
  subtitle_id: string;
  language: string;
  download_count: number;
  new_download_count: number;
  hearing_impaired: boolean;
  hd: boolean;
  fps: number;
  votes: number;
  points: number;
  ratings: number;
  from_trusted: boolean;
  foreign_parts_only: boolean;
  ai_translated: boolean;
  machine_translated: boolean;
  upload_date: string;
  release: string;
  comments: string;
  legacy_subtitle_id: number;
  uploader: Uploader;
  feature_details: FeatureDetails;
  url: string;
  files: Array<File>;
}
export interface Uploader {
  uploader_id: number;
  name: string;
  rank: string;
}
export interface FeatureDetails {
  feature_id: number;
  feature_type: string;
  year: number;
  title: string;
  movie_name: string;
  imdb_id: number;
  tmdb_id: number;
}
export interface File {
  file_id: number;
  cd_number: number;
  file_name: string;
}
export interface FeaturesRequestParams {
  /**
   * opensubtitles feature_id
   */
  feature_id?: number;
  /**
   * IMDB ID, delete leading zeroes
   */
  imdb_id?: number;
  /**
   * query to search, release/file name accepted
   * >= 3 characters
   */
  query?: string;
  /**
   * TheMovieDB ID - combine with type to avoid errors
   */
  tmdb_id?: number;
  /**
   * empty to list all or movie, tvshow or episode.
   */
  type?: string;
  /**
   * Filter by year. Can only be used in combination with a query
   */
  year?: number;
}
export interface FeaturesResponse extends Response {
  data: Array<FeaturesResponseData>;
}
export interface FeaturesResponseData {
  id: string;
  type: string;
  attributes: FeaturesResponseDataAttributes;
}
export interface FeaturesResponseDataAttributes {
  title: string;
  original_title: string;
  year: string;
  subtitles_counts: SubtitlesCounts;
  subtitles_count: number;
  imdb_id: number;
  tmdb_id: number;
  feature_id: string;
  title_aka: Array<string>;
  url: string;
  img_url: string;
  //for movie/episode
  seasons_count?: string;
  parent_title?: string;
  season_number?: number;
  episode_number?: number|null;
  parent_imdb_id?: number|null;
  feature_type?: string;
  //for tv show
  seasons?: Array<Season>;
}
export interface SubtitlesCounts {
  ar?: number;
  bg?: number;
  bs?: number;
  ca?: number;
  cs?: number;
  da?: number;
  de?: number;
  el?: number;
  en?: number;
  es?: number;
  et?: number;
  fa?: number;
  fi?: number;
  fr?: number;
  he?: number;
  hr?: number;
  hu?: number;
  id?: number;
  it?: number;
  ja?: number;
  ko?: number;
  mk?: number;
  nl?: number;
  no?: number;
  pl?: number;
  'pt-BR'?: number;
  'pt-PT'?: number;
  ro?: number;
  ru?: number;
  sk?: number;
  sl?: number;
  sr?: number;
  sv?: number;
  th?: number;
  tr?: number;
  vi?: number;
  'zh-CN'?: number;
  'zh-TW'?: number;
}
export interface Season {
  season_number?: number;
  episodes?: Array<Episode>;
}
export interface Episode {
  episode_number?: number;
  title?: string;
  feature_id?: number;
  feature_imdb_id?: number;
}