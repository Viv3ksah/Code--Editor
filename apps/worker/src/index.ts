import { createClient } from "redis";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import cluster from "cluster";

const execAsync = promisify(exec);
const numCPUs = Number(process.env.WORKER_PROCS || 1);
const useDocker = process.env.USE_DOCKER === "true";

function redisOpts() {
  const url = process.env.REDIS_URL;
  return url ? { url } : undefined;
}

function buildCommand(
  language: string,
  absoluteCodeDir: string,
  codeFilePath: string
): string {
  const inputFile = path.join(absoluteCodeDir, "input.txt");
  const base = path.basename(codeFilePath);
  const dir = absoluteCodeDir.replace(/\\/g, "/");

  if (useDocker) {
    const volume = `-v "${dir}:/usr/src/app"`;
    const limits = `--rm --memory="256m" --cpus="1.0" --pids-limit 100`;
    switch (language) {
      case "javascript":
        return `docker run ${limits} ${volume} node:18 sh -c "node /usr/src/app/${base} < /usr/src/app/input.txt"`;
      case "python":
        return `docker run ${limits} ${volume} python:3.9 sh -c "python /usr/src/app/${base} < /usr/src/app/input.txt"`;
      case "cpp":
        return `docker run ${limits} ${volume} gcc:11 sh -c "g++ /usr/src/app/userCode.cpp -o /usr/src/app/a.out && /usr/src/app/a.out < /usr/src/app/input.txt"`;
      case "rust":
        return `docker run ${limits} ${volume} rust:latest sh -c "rustc /usr/src/app/userCode.rs -o /usr/src/app/a.out && /usr/src/app/a.out < /usr/src/app/input.txt"`;
      case "java":
        return `docker run ${limits} ${volume} openjdk:17 sh -c "javac /usr/src/app/UserCode.java && java -cp /usr/src/app UserCode < /usr/src/app/input.txt"`;
      case "go":
        return `docker run ${limits} ${volume} golang:1.18 sh -c "go run /usr/src/app/userCode.go < /usr/src/app/input.txt"`;
      default:
        throw new Error("Unsupported language");
    }
  }

  // Native execution (cloud / Railway image with runtimes installed)
  switch (language) {
    case "javascript":
      return `node "${codeFilePath}" < "${inputFile}"`;
    case "python":
      return `python3 "${codeFilePath}" < "${inputFile}"`;
    case "cpp":
      return `g++ "${codeFilePath}" -o "${path.join(absoluteCodeDir, "a.out")}" && "${path.join(absoluteCodeDir, "a.out")}" < "${inputFile}"`;
    case "rust":
      return `rustc "${codeFilePath}" -o "${path.join(absoluteCodeDir, "a.out")}" && "${path.join(absoluteCodeDir, "a.out")}" < "${inputFile}"`;
    case "java":
      return `javac "${codeFilePath}" && java -cp "${absoluteCodeDir}" UserCode < "${inputFile}"`;
    case "go":
      return `go run "${codeFilePath}" < "${inputFile}"`;
    default:
      throw new Error("Unsupported language");
  }
}

async function writeCodeFiles(
  language: string,
  absoluteCodeDir: string,
  code: string,
  input: string
): Promise<string> {
  await fs.writeFile(path.join(absoluteCodeDir, "input.txt"), input ?? "", "utf8");

  switch (language) {
    case "javascript": {
      const p = path.join(absoluteCodeDir, "userCode.js");
      await fs.writeFile(p, code);
      return p;
    }
    case "python": {
      const p = path.join(absoluteCodeDir, "userCode.py");
      await fs.writeFile(p, code);
      return p;
    }
    case "cpp": {
      const p = path.join(absoluteCodeDir, "userCode.cpp");
      await fs.writeFile(p, code);
      return p;
    }
    case "rust": {
      const p = path.join(absoluteCodeDir, "userCode.rs");
      await fs.writeFile(p, code);
      return p;
    }
    case "java": {
      const p = path.join(absoluteCodeDir, "UserCode.java");
      await fs.writeFile(p, code);
      return p;
    }
    case "go": {
      const p = path.join(absoluteCodeDir, "userCode.go");
      await fs.writeFile(p, code);
      return p;
    }
    default:
      throw new Error("Unsupported language");
  }
}

if (cluster.isPrimary && numCPUs > 1) {
  console.log(`Master ${process.pid} is running (${numCPUs} workers)`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died — restarting`);
    cluster.fork();
  });
} else {
  const client = createClient(redisOpts());
  const pubClient = createClient(redisOpts());

  async function processSubmission(submission: string) {
    const { code, language, roomId, submissionId, input } =
      JSON.parse(submission);
    console.log(
      `Processing submission for room id: ${roomId}, submission id: ${submissionId}`
    );

    const absoluteCodeDir = path.resolve(`./tmp/user-${Date.now()}`);
    await fs.mkdir(absoluteCodeDir, { recursive: true });

    let result = "";
    try {
      const codeFilePath = await writeCodeFiles(
        language,
        absoluteCodeDir,
        code,
        input
      );
      const command = buildCommand(language, absoluteCodeDir, codeFilePath);
      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 15000,
          maxBuffer: 1024 * 1024,
          shell: true,
        });
        result = stdout || stderr || "(no output)";
      } catch (error: any) {
        result =
          error.stdout ||
          error.stderr ||
          `Error: ${error.message}`;
      }
      console.log(`Result for room ${roomId}: ${result}`);
      await pubClient.publish(roomId, result);
    } catch (error: any) {
      console.error("Failed to process submission:", error);
      try {
        await pubClient.publish(
          roomId,
          `Error: ${error.message || "execution failed"}`
        );
      } catch {
        /* ignore */
      }
    } finally {
      try {
        await fs.rm(absoluteCodeDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }

  async function main() {
    try {
      await client.connect();
      await pubClient.connect();
      console.log(
        `Worker ready (docker=${useDocker}, pid=${process.pid})`
      );

      while (true) {
        const submission = await client.brPop("problems", 0);
        if (submission) {
          await processSubmission(submission.element);
        }
      }
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      process.exit(1);
    }
  }

  main();
}
