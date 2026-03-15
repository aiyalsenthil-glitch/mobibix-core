import * as bodyParser from 'body-parser';

export const rawBodyMiddleware = bodyParser.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
});
