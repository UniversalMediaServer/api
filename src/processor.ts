import { JSONCodec } from 'nats';
import { natsWrapper } from './services/nats';
import connect from './models/connection';

const db: string = process.env.MONGO_URL;
connect(db);

(async () => {
  await natsWrapper.connect();
  const sub = natsWrapper.client.subscribe('ums:metadata-job');
  for await (const m of sub) {
    const message: any = JSONCodec().decode(m.data);
    console.log(`Message from nats: ${JSON.stringify(message)}`)
    for await (const search of message.searches) {
    // TODO's
    // call getVideo or getSeason from the media controller. if a document is found or created, save it in order to write this back to mongo document for this job
    // update job status to completed
    }
  }
})();
