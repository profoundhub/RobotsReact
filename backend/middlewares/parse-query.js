import Path from "path";
import {map} from "ramda";
import {validate} from "tcomb-validation";
import {PUBLIC_DIR} from "shared/constants";
import * as jsonApi from "shared/helpers/jsonapi";
import {parseTyped} from "shared/parsers";
import logger from "backend/logger";

export default function createParseQuery(type) {
  if (!type) { throw Error("`type` is required"); }
  return function parseQuery(req, res, cb) {
    req.query = jsonApi.parseQuery(req.query);
    let data = parseTyped(type, req.query);
    let result = validate(data, type);
    if (result.isValid()) {
      return cb();
    } else {
      if (process.env.NODE_ENV != "testing") {
        logger.error(result.errors);
      }
      return res.status(400).sendFile(Path.join(PUBLIC_DIR, "errors/400.html"));
    }
  };
}
