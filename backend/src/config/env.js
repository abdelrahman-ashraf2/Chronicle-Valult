import dotenv from "dotenv";

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] || fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = required("JWT_SECRET");

if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters in production.");
}

export const env = Object.freeze({
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "vintage_watch_auth"
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "30m",
    issuer: process.env.JWT_ISSUER || "chronicle-vault",
    audience: process.env.JWT_AUDIENCE || "chronicle-vault-web"
  },
  authCookieName: process.env.AUTH_COOKIE_NAME || "chronicle_session",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
  clientOrigins: (
    process.env.CLIENT_URL ||
    process.env.CLIENT_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
});
