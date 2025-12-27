import TMDBConfiguration, { TMDBConfigurationInterface } from '../models/TMDBConfiguration';
import { tmdb } from '../services/tmdb-api';

let configuration: Partial<TMDBConfigurationInterface>;
let configurationExpiryDate: Date;

export const getTMDBImageBaseURL = async(): Promise<string> => {
  // 1) Return in-memory value unless it has expired
  const today = new Date();
  if (configuration && configurationExpiryDate && today < configurationExpiryDate) {
    return configuration.imageBaseURL;
  }

  // 2) See if it has already been fetched to our database
  configuration = await TMDBConfiguration.findOne().lean()
    .exec();

  // 3) Last try, get it from TMDB directly, and persist to memory and database
  if (!configuration) {
    const configurationResponse = await tmdb.configuration();
    const imageBaseURL = configurationResponse.images.secure_base_url;
    configuration = { imageBaseURL };
    await TMDBConfiguration.create(configuration);
  }

  configurationExpiryDate = new Date();
  configurationExpiryDate.setDate(today.getDate() + 3);

  return configuration.imageBaseURL;
};

export const getConfiguration = async(ctx): Promise<{ imageBaseURL: string }> => {
  const response = { imageBaseURL: await getTMDBImageBaseURL() };
  return ctx.body = response;
};
