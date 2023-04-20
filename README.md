# UMS API ![Build Status](https://github.com/UniversalMediaServer/api/workflows/UMS%20API%20tests/badge.svg)

## Development

The required Node.js and Yarn versions are listed in the `package.json` file. 

You can run `nvm use` and `yvm use` from the project root if you have [Node version manager](https://github.com/nvm-sh/nvm) and [Yarn version manager](https://yvm.js.org)s installed to select the correct version.

### Environment variables

- `MONGO_URL` URL to a running Mongo instance which includes user and password
- `OS_API_USERAGENT` an Open Subtitles User-Agent key. Defaults to a testing key `TemporaryUserAgent`
- `BYPASS_MONGO` if set to `"true"`, will drop the database on each request, to get fresh data from external APIS. Use with caution.
- `UMS_API_PRIVATE_KEY_LOCATION` and `UMS_API_PUBLIC_KEY_LOCATION` optional absolute locations of SSL keys for HTTPS

### Commands

#### `yarn watch`
Watches for changes to TypeScript files and compiles them to JavaScript (use `yarn run build` to do it manually)

#### `yarn dev`
Runs the development server and restarts it when any file is changed

#### `yarn dev:cron`
Runs the cron job feature using ts-node

#### `yarn start`
Runs the server

#### `yarn test`
Runs the test suite

#### `yarn run start:prod`
Starts the API and cron job in production mode, which uses PM2 for process management. TypeScript files are compiled in memory on application start.

### Debugging

#### OpenSubtitles
Our OpenSubtitles API module uses `xmlrpc` to transform XML requests before they hit that module, so one way to see the raw request and response bodies is to edit that library locally.
Add the following code in `./node_modules/xmlrpc/lib/client.js` after [this line](https://github.com/baalexander/node-xmlrpc/blob/643dc8f80cd284849b6c07e650ddfb9213168a39/lib/client.js#L129).

```
console.log('OpenSubtitles request body', xml);
console.log('OpenSubtitles response body', body.join(''));
```