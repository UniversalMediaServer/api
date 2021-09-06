import { ParameterizedContext } from 'koa';

import TMDBConfiguration from '../models/TMDBConfiguration';
import { moviedb } from './media';

export const getTMDBImagePrepend = async(ctx: ParameterizedContext): Promise<{ imagePrepend: string }> => {
  const configuration = await TMDBConfiguration.findOne().lean();
  if (configuration) {
    return { imagePrepend: configuration.imagePrepend };
  }

  const configurationResponse = await moviedb.configuration();
  const imagePrepend = configurationResponse.images.secure_base_url;
  await TMDBConfiguration.create({ imagePrepend: imagePrepend + 'original' });

  return ctx.body = { imagePrepend };
};
