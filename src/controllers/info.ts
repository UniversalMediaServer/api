import { ParameterizedContext } from 'koa';

import TMDBConfiguration from '../models/TMDBConfiguration';
import { moviedb } from './media';

export const getTMDBImageBaseURL = async(ctx: ParameterizedContext): Promise<{ imageBaseURL: string }> => {
  const configuration = await TMDBConfiguration.findOne().lean().exec();
  if (configuration) {
    return { imageBaseURL: configuration.imageBaseURL };
  }

  const configurationResponse = await moviedb.configuration();
  const imageBaseURL = configurationResponse.images.secure_base_url;
  await TMDBConfiguration.create({ imageBaseURL: imageBaseURL + 'original' });

  return ctx.body = { imageBaseURL };
};
