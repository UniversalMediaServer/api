import { ParameterizedContext } from 'koa';

import TMDBConfiguration from '../models/TMDBConfiguration';
import { moviedb } from '../services/tmdb-api';

export const getTMDBImageBaseURL = async(): Promise<string> => {
  const configuration = await TMDBConfiguration.findOne().lean()
    .exec();
  if (configuration) {
    return configuration.imageBaseURL;
  }

  const configurationResponse = await moviedb.configuration();
  const imageBaseURL = configurationResponse.images.secure_base_url;
  await TMDBConfiguration.create({ imageBaseURL: imageBaseURL });

  return imageBaseURL;
};

export const getConfig = async(ctx: ParameterizedContext): Promise<{ imageBaseURL: string }> => {
  const response = { imageBaseURL: await getTMDBImageBaseURL() };
  return ctx.body = response;
};
