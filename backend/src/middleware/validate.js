import { validationResult } from "express-validator";
import { BadRequestError } from "../utils/httpErrors.js";

export function validateRequest(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return next(new BadRequestError(
    "Validation failed.",
    result.array().map(({ path, msg }) => ({ field: path, message: msg }))
  ));
}
