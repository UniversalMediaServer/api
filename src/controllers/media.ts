import { SearchRequest, TVShow } from '@universalmediaserver/node-imdb-api';
import { Context } from 'koa';
import * as _ from 'lodash';
import * as episodeParser from 'episode-parser';
import * as natural from 'natural';

import { IMDbIDNotFoundError, MediaNotFoundError, ValidationError } from '../helpers/customErrors';
import EpisodeProcessing from '../models/EpisodeProcessing';
import FailedLookups, { FailedLookupsInterface } from '../models/FailedLookups';
import MediaMetadata, { MediaMetadataInterface } from '../models/MediaMetadata';
import SeriesMetadata, { SeriesMetadataInterface } from '../models/SeriesMetadata';
import osAPI from '../services/opensubtitles';
import imdbAPI from '../services/imdb-api';
import { mapper } from '../utils/data-mapper';

export const FAILED_LOOKUP_SKIP_DAYS = 30;

/**
 * Attempts a query to the IMDb API and standardizes the response
 * before returning.
 *
 * IMDb does not return goofs, osdbHash, tagline, trivia
 *
 * We use ts-ignore to be able to use episode data instead of just movie.
 * @see https://github.com/worr/node-imdb-api/issues/72
 *
 * @param imdbId the IMDb ID
 * @param searchRequest a query to perform in order to get the imdbId
 */
const getFromIMDbAPI = async(imdbId?: string, searchRequest?: SearchRequest): Promise<MediaMetadataInterface> => {
  if (!imdbId && !searchRequest) {
    throw new Error('All parameters were falsy');
  }

  /**
   * We need the IMDb ID for the imdbAPI get request below so here we get it.
   * Along the way, if the result is an episode, we also instruct our episode
   * processor to asynchronously add the other episodes for that series to the
   * queue.
   */
  if (!imdbId) {
    const parsedFilename = episodeParser(searchRequest.name);
    const isTVEpisode = Boolean(parsedFilename && parsedFilename.show && parsedFilename.season && parsedFilename.episode);
    if (isTVEpisode) {
      searchRequest.name = parsedFilename.show;
      searchRequest.reqtype = 'series';
      const tvSeriesInfo = await imdbAPI.get(searchRequest);

      if (tvSeriesInfo && tvSeriesInfo instanceof TVShow) {
        const allEpisodes = await tvSeriesInfo.episodes();
        const currentEpisode = _.find(allEpisodes, { season: parsedFilename.season, episode: parsedFilename.episode });
        if (!currentEpisode) {
          throw new IMDbIDNotFoundError();
        }

        imdbId = currentEpisode.imdbid;
      }
    }

    if (!imdbId) {
      searchRequest.reqtype = 'movie';
      const searchResults = await imdbAPI.search(searchRequest);
      // find the best search results utilising the Jaro-Winkler distance metric
      const searchResultStringDistance = searchResults.results.map(result => natural.JaroWinklerDistance(searchRequest.name, result.title));
      const bestSearchResultKey = _.indexOf(searchResultStringDistance, _.max(searchResultStringDistance));

      const searchResult: any = searchResults.results[bestSearchResultKey];
      if (!searchResult) {
        throw new IMDbIDNotFoundError();
      }

      imdbId = searchResult.imdbid;
    }
  }

  const imdbData = await imdbAPI.get({ id: imdbId });
  if (!imdbData) {
    return null;
  }

  let metadata;
  if (imdbData.type === 'movie') {
    metadata = mapper.parseIMDBAPIMovieResponse(imdbData);
  } else if (imdbData.type === 'series') {
    metadata = mapper.parseIMDBAPISeriesResponse(imdbData);
  } else if (imdbData.type === 'episode') {
    // @ts-ignore
    await EpisodeProcessing.create({ seriesimdbid: imdbData.seriesid });
    metadata = mapper.parseIMDBAPIEpisodeResponse(imdbData);
  } else {
    throw new Error('Received a type we did not expect');
  }

  return metadata;
};

/**
 * Sets and returns series metadata by IMDb ID.
 *
 * @param imdbId 
 */
const setSeriesMetadataByIMDbID = async(imdbId: string): Promise<SeriesMetadataInterface> => {
  if (!imdbId) {
    throw new Error('IMDb ID not supplied');
  }

  const existingSeries: SeriesMetadataInterface = await SeriesMetadata.findOne({ imdbID: imdbId }, null, { lean: true }).exec();
  if (existingSeries) {
    return existingSeries;
  }

  const imdbData: SeriesMetadataInterface = await getFromIMDbAPI(imdbId);
  if (!imdbData) {
    return null;
  }

  return SeriesMetadata.create(imdbData);
};

export const getByOsdbHash = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { osdbhash: osdbHash, filebytesize } = ctx.params;
  const validateMovieByYear = Boolean(ctx.query?.year);
  const validateEpisodeBySeasonAndEpisode = Boolean(ctx.query?.season && ctx.query?.episodeNumber);

  let dbMeta: MediaMetadataInterface = await MediaMetadata.findOne({ osdbHash }, null, { lean: true }).exec();

  if (dbMeta) {
    return ctx.body = dbMeta;
  }
  if (await FailedLookups.findOne({ osdbHash }, '_id', { lean: true }).exec()) {
    throw new MediaNotFoundError();
  }

  const osQuery = {
    moviehash: osdbHash,
    moviebytesize: parseInt(filebytesize),
    extend: true,
  };

  const openSubtitlesResponse = await osAPI.identify(osQuery);
  // Fail early if OpenSubtitles reports that it did not recognize the hash
  if (!openSubtitlesResponse.metadata) {
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  // validate that OpenSubtitles has found correct metadata by Osdb hash
  if (validateMovieByYear || validateEpisodeBySeasonAndEpisode) {
    let passedValidation = false;
    if (validateMovieByYear) {
      if (ctx.query.year.toString() === openSubtitlesResponse.metadata.year) {
        passedValidation = true;
      }
    }

    if (validateEpisodeBySeasonAndEpisode) {
      if (ctx.query.season.toString() === openSubtitlesResponse.metadata.season && ctx.query.episodeNumber.toString() === openSubtitlesResponse.metadata.episode) {
        passedValidation = true;
      }
    }

    if (!passedValidation) {
      await FailedLookups.updateOne({ osdbHash }, { failedValidation: true }, { upsert: true, setDefaultsOnInsert: true }).exec();
      throw new MediaNotFoundError();
    }
  }

  const parsedOpenSubtitlesResponse = mapper.parseOpenSubtitlesResponse(openSubtitlesResponse);
  const parsedIMDbResponse: MediaMetadataInterface = await getFromIMDbAPI(parsedOpenSubtitlesResponse.imdbID);
  const combinedResponse = _.merge(parsedOpenSubtitlesResponse, parsedIMDbResponse);

  try {
    dbMeta = await MediaMetadata.create(combinedResponse);
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ osdbHash }, {}, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};

export const getBySanitizedTitle = async(ctx: Context): Promise<MediaMetadataInterface | string> => {
  const { title } = ctx.query;
  const year = ctx.query.year ? Number(ctx.query.year) : null;

  if (!title) {
    throw new ValidationError('title is required');
  }

  // If we already have a result, return it
  const existingResultFromSearchMatch: MediaMetadataInterface = await MediaMetadata.findOne({ searchMatches: { $in: [title] } }, null, { lean: true }).exec();
  if (existingResultFromSearchMatch) {
    return ctx.body = existingResultFromSearchMatch;
  }

  // If we already failed to get a result, return early
  const failedLookupQuery: any = { title };
  if (year) {
    failedLookupQuery.year = year;
  }
  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    throw new MediaNotFoundError();
  }

  const searchRequest: SearchRequest = { name: title };
  if (year) {
    searchRequest.year = year;
  }
  const imdbData: MediaMetadataInterface = await getFromIMDbAPI(null, searchRequest);

  if (!imdbData) {
    await FailedLookups.updateOne(failedLookupQuery, {}, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  /**
   * If we already have a result based on IMDb ID, return it after adding
   * this new searchMatch to the array.
   */
  const existingResultFromIMDbID: MediaMetadataInterface = await MediaMetadata.findOne({ imdbID: imdbData.seriesIMDbID }, null, { lean: true }).exec();
  if (existingResultFromIMDbID) {
    const updatedResult = await MediaMetadata.findOneAndUpdate(
      { imdbID: imdbData.seriesIMDbID },
      { $push: { searchMatches: title } },
      { new: true, lean: true },
    ).exec();
    // @ts-ignore
    return ctx.body = updatedResult;
  }

  if (imdbData.type === 'episode') {
    await setSeriesMetadataByIMDbID(imdbData.seriesIMDbID);
  }

  try {
    imdbData.searchMatches = [title];
    /**
     * The below section is untidy due to the following possible bug https://github.com/Automattic/mongoose/issues/9118
     * Once clarity on the feature, or if a bugfix is released we could refactor the below
     */
    let newlyCreatedResult = await MediaMetadata.create(imdbData);
    // @ts-ignore
    newlyCreatedResult = newlyCreatedResult.toObject();
    delete newlyCreatedResult.searchMatches;
    return ctx.body = newlyCreatedResult;
  } catch (e) {
    await FailedLookups.updateOne(failedLookupQuery, {}, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }

  /**
   * @todo OpenSubtitles-api doesn't return complete enough data from
   * its SearchSubtitles function, but we can possibly figure out how to search
   * OpenSubtitles for that fallback data.
   */
};

export const getSeriesByTitle = async(ctx: Context): Promise<SeriesMetadataInterface | string> => {
  let { title: dirOrFilename } = ctx.query;
  const year = ctx.query.year;
  if (!dirOrFilename) {
    throw new ValidationError('title is required');
  }

  let dbMeta: SeriesMetadataInterface = await SeriesMetadata.findSimilarSeries(dirOrFilename, year);

  if (dbMeta) {
    return ctx.body = dbMeta;
  }

  const failedLookupQuery: FailedLookupsInterface = { title: dirOrFilename, type: 'series' };
  if (year) {
    failedLookupQuery.year = year;
  }

  if (await FailedLookups.findOne(failedLookupQuery, '_id', { lean: true }).exec()) {
    throw new MediaNotFoundError();
  }

  const parsed = episodeParser(dirOrFilename);
  dirOrFilename = parsed && parsed.show ? parsed.show : dirOrFilename;
  const searchRequest: SearchRequest = {
    name: dirOrFilename,
    reqtype: 'series',
  };
  if (year) {
    searchRequest.year = year;
  }
  const tvSeriesInfo = await imdbAPI.get(searchRequest);

  if (!tvSeriesInfo) {
    await FailedLookups.updateOne(failedLookupQuery, {}, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
  const metadata = mapper.parseIMDBAPISeriesResponse(tvSeriesInfo);
  dbMeta = await SeriesMetadata.create(metadata);
  return ctx.body = dbMeta;
};

export const getByImdbID = async(ctx: Context): Promise<any> => {
  const { imdbid } = ctx.query;

  const [mediaMetadata, seriesMetadata] = await Promise.all([
    MediaMetadata.findOne({ imdbID: imdbid }, null, { lean: true }).exec(),
    SeriesMetadata.findOne({ imdbID: imdbid }, null, { lean: true }).exec(),
  ]);

  if (mediaMetadata) {
    return ctx.body = mediaMetadata;
  }

  if (seriesMetadata) {
    return ctx.body = seriesMetadata;
  }

  if (await FailedLookups.findOne({ imdbID: imdbid }, null, { lean: true }).exec()) {
    throw new MediaNotFoundError();
  }
  const imdbData: MediaMetadataInterface = await getFromIMDbAPI(imdbid);

  try {
    let dbMeta;
    if (imdbData.type === 'series') {
      dbMeta = await SeriesMetadata.create(imdbData);
    } else {
      dbMeta = await MediaMetadata.create(imdbData);
    }
    return ctx.body = dbMeta;
  } catch (e) {
    await FailedLookups.updateOne({ imdbId: imdbid }, {}, { upsert: true, setDefaultsOnInsert: true }).exec();
    throw new MediaNotFoundError();
  }
};
