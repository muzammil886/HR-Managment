import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import { ApiError } from "./http";
import { prisma } from "./prisma";
import { dispatch } from "./routes";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.use("/api", (req, res, next) => {
  void dispatch(req, res).catch(next);
});

app.use((req, res) => res.status(404).json({ error: `Unknown API route ${req.method} ${req.path}` }));

const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  void _next;
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message, extra: error.extra ?? null });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Server error" });
};
app.use(errors);

const port = Number(process.env.BACKEND_PORT || 4100);
const server = app.listen(port, process.env.BACKEND_HOST || "0.0.0.0", () => {
  console.log(`HCM Lite API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => { void prisma.$disconnect().finally(() => process.exit(0)); }));
}
