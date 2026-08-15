import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createGithubRouter } from "./github";
import { createRedisClient } from "./redis";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const redisClient = createRedisClient();

redisClient.on("error", (err) => console.log("Redis Client Error", err));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/github", createGithubRouter());

app.post("/submit", async (req, res) => {
  const { code, language, roomId, input } = req.body;
  const submissionId = `submission-${Date.now()}-${roomId}`;

  console.log(`Received submission from room ${roomId}`);

  try {
    await redisClient.lPush(
      "problems",
      JSON.stringify({ code, language, roomId, submissionId, input })
    );

    console.log(
      `Submission pushed to Redis for: ${roomId}  and problem id: ${submissionId}`
    );

    res.status(200).send("Submission received and stored");
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to store submission");
  }
});

// Serve built frontend from ./public when present
const publicDir = path.join(__dirname, "..", "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/github") ||
      req.path.startsWith("/submit") ||
      req.path.startsWith("/health")
    ) {
      return next();
    }
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", () => {
  console.log(`Express Server Listening on port ${port}`);
});

async function main() {
  try {
    await redisClient.connect();
    console.log("Redis Client Connected");
  } catch (error) {
    console.log("Failed to connect to Redis", error);
  }
}

main();
