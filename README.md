# UMS API [![Build Status](https://travis-ci.org/UniversalMediaServer/api.svg?branch=master)](https://travis-ci.org/UniversalMediaServer/api)

## Development

The required Node.js and Yarn versions are listed in the `package.json` file. 

You can run `nvm use` and `yvm use` from the project root if you have [Node version manager](https://github.com/nvm-sh/nvm) and [Yarn version manager](https://yvm.js.org)s installed to select the correct version.

### Environment variables

`MONGO_URL` URL to a running Mongo instance which includes user and password

### Commands

#### `yarn watch`
Watches for changes to TypeScript files and compiles them to JavaScript (use `yarn run build` to do it manually)

#### `yarn dev`
Runs the development server and restarts it when any file is changed

#### `yarn start`
Runs the server

#### `yarn test`
Runs the test suite
