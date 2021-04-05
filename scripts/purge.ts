'use strict';
import * as inquirer from 'inquirer';
import got from 'got';
import connect from '../src/models/connection';
import MediaMetadata from '../src/models/MediaMetadata';
import SeriesMetadata from '../src/models/SeriesMetadata';
import FailedLookups from '../src/models/FailedLookups';
import EpisodeProcessing from '../src/models/EpisodeProcessing';

const db = process.env.MONGO_URL;

const client = got.extend({
  prefixUrl: 'https://api.cloudflare.com/client/v4',
  headers: {
    'X-Auth-Email': process.env.CF_API_KEY_EMAIL,
    'X-Auth-Key': process.env.CF_API_KEY,
  },
});
 
inquirer
  .prompt([
    {
      type: 'checkbox',
      message: 'Select what to purge',
      name: 'purge_items',
      choices: [
        new inquirer.Separator('MongoDB Collections'),
        {
          name: 'Series Metadata',
          value: 'series_metadata',
        },
        {
          name: 'Media Metadata',
          value: 'media_metadata',
        },
        {
          name: 'Failed Lookups',
          value: 'failed_lookups',
        },
        {
          name: 'Episode Processing',
          value: 'episode_processing',
        },
        new inquirer.Separator('Cloudflare'),
        {
          name: 'Cloudflare cache',
          value: 'cf_cache',
        },
      ],
    },
  ])
  .then(async(answers) => {
    console.info('Starting purge\n');
    connect(db);
    const purgeItems = answers['purge_items'];
    const promises = [];

    if (purgeItems.includes('series_metadata')) {
      promises.push(SeriesMetadata.deleteMany());
    }
    if (purgeItems.includes('media_metadata')) {
      promises.push(MediaMetadata.deleteMany());
    }
    if (purgeItems.includes('failed_lookups')) {
      promises.push(FailedLookups.deleteMany());
    }
    if (purgeItems.includes('episode_processing')) {
      promises.push(EpisodeProcessing.deleteMany());
    }
    if (purgeItems.includes('cf_cache')) {
      promises.push(client.post('/zones/9beea5376616e62f3dcda4ddcec62f79/purge_cache', { json: { 'purge_everything': true } }));
    }

    await Promise.all(promises);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
