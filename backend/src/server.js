import cors from "cors";
import express from "express";
import helmet from "helmet";
import { testConnection } from "./config/db.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { ForbiddenError } from "./utils/httpErrors.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ForbiddenError("Origin is not allowed by CORS."));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", resourceRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await testConnection();
    app.listen(env.port, () => {
      console.log(`Chronicle Vault API running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Unable to connect to MySQL:", error.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  start();
}

export { start };
