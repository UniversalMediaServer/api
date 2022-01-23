import * as nats from 'nats';

class NatsWrapper {
    private _client?: any;

    get client(): any {
      if (!this._client) {
        throw new Error('Cannot access the client before connecting.');
      }
      return this._client;
    }

    async connect(): Promise<any> {
      this._client = await nats.connect();
      console.log('Connected to NATS');
    }
}

export const natsWrapper = new NatsWrapper();
