import { ParameterizedContext } from 'koa';
import * as Joi from 'joi';
import { JSONCodec } from 'nats';
import { natsWrapper } from '../services/nats';
import Job from '../models/Job';
import { v4 as uuidv4 } from 'uuid';

// create a job for later processing
export const create = async(ctx: ParameterizedContext): Promise<object> => {
  // TODO: mode this validation to a middleware
  const schema = Joi.object({
    searches: Joi.array().items(Joi.object({
      type: Joi.string()
        .valid('season', 'file')
        .required(),
      query: Joi.object({
        title: Joi.string(),
        osdbHash: Joi.string(),
        imdbID: Joi.string(),
        episode: Joi.string(),
        season: Joi.string(),
        year: Joi.string(),
        filebytesize: Joi.string(),
      }).required(),
    }).required())
      .required()
      .max(1)
      .max(50),
  }).required();

  const { error } = schema.validate(ctx.request.body);
  if (error) {
    ctx.status = 422;
    return ctx.body = error.details;
  }

  const jobId = uuidv4();
  // post the job to NATS for asynchronous processing
  await natsWrapper.client.publish('ums:metadata-job', JSONCodec().encode({ jobId, searches: ctx.request.body.searches }));
  await Job.create({ jobId, searches: ctx.request.body.searches });
  ctx.status = 201;
  return ctx.body = { jobId };
};

// check for a job result
export const get = async(ctx: ParameterizedContext): Promise<object> => {
  return ctx.body = await Job.findOne({ jobId: ctx.params.jobId });
};
