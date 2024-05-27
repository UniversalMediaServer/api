/*
 * These versions get bumped to tell the client that
 * it should update its relevant data.
 * e.g. if we did an API change that improved our results
 * for videos in any way, we should bump that version by 1.
 */
export const subversions = {
  'collection': '1',
  'configuration': '1',
  'localize': '1',
  'season': '1',
  'series': '2',
  'video': '4',
};
