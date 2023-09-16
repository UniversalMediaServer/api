import * as _ from 'lodash';

import { getTMDBImageBaseURL } from '../../controllers/configuration';
import { MediaMetadataInterface } from '../../models/MediaMetadata';
import { SeriesMetadataInterface } from '../../models/SeriesMetadata';

/*
 * If the incoming metadata contains a poster image within the images
 * array, we populate the poster value with that, and return the whole object.
 *
 * This must be done on-the-fly like this because the imageBaseURL can change.
 */
export const addPosterFromImages = async(metadata): Promise<SeriesMetadataInterface | MediaMetadataInterface> => {
  if (!metadata) {
    throw new Error('Metadata is required');
  }

  if (metadata.poster) {
    // There is already a poster
    return metadata;
  }

  let posterRelativePath: string;

  if (metadata.posterRelativePath) {
    posterRelativePath = metadata.posterRelativePath;
  } else {
    const potentialPosters = metadata?.images?.posters ? metadata?.images?.posters : [];
    const potentialStills = metadata?.images?.stills || [];
    const potentialImagesCombined = _.concat(potentialPosters, potentialStills);
    if (_.isEmpty(potentialImagesCombined)) {
      // There are no potential images
      return metadata;
    }

    const englishImages = _.filter(potentialImagesCombined, { 'iso_639_1': 'en' }) || [];
    const noLanguageImages = _.filter(potentialImagesCombined, { 'iso_639_1': null }) || [];
    const posterCandidates = _.merge(noLanguageImages, englishImages);
    if (!posterCandidates || _.isEmpty(posterCandidates)) {
      // There are no English or non-language images
      return metadata;
    }

    const firstPoster = _.first(posterCandidates);
    posterRelativePath = firstPoster.file_path;
  }

  if (posterRelativePath) {
    const imageBaseURL = await getTMDBImageBaseURL();
    metadata.poster = imageBaseURL + 'w500' + posterRelativePath;
  }

  return metadata;
};
