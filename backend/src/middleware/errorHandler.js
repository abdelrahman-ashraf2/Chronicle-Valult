import { HttpError } from "../utils/httpErrors.js";

export function notFoundHandler(_req, res) {
  return res.status(404).json({ message: "Route not found." });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    const payload = { message: error.message };

    if (error.details) {
      payload.details = error.details;
    }

    return res.status(error.statusCode).json(payload);
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "A record with that unique value already exists." });
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ message: "A referenced record does not exist." });
  }

  if (error.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({ message: "This record is still referenced by other records." });
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Evidence file is too large." });
  }

  if (
    error.name === "MulterError" ||
    error.message === "Unsupported evidence file type." ||
    error.message === "Only CSV files are supported."
  ) {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error." });
}
