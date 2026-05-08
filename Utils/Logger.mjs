import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirName = path.dirname(fileURLToPath(import.meta.url));

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

export default class Logger {
  #level;
  #logFile;

  constructor() {
    this.#level = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
    if (!LEVELS.hasOwnProperty(this.#level)) {
      this.#level = "INFO";
    }

    const logsDir = path.join(__dirName, "../Logs");
    fs.mkdirSync(logsDir, { recursive: true });
    this.#logFile = fs.createWriteStream(path.join(logsDir, "app.log"), {
      flags: "a",
      encoding: "utf8",
    });
  }

  #shouldLog(level) {
    return LEVELS[level] >= LEVELS[this.#level];
  }

  #write(level, message) {
    if (!this.#shouldLog(level)) return;

    const text = typeof message === "string"
      ? message
      : message instanceof Error
        ? message.stack || message.message
        : JSON.stringify(message, null, 2);

    const formatted = `[${new Date().toISOString()}] [${level}] ${text}\n`;
    process.stdout.write(formatted);
    this.#logFile.write(formatted);
  }

  debug(message) {
    this.#write("DEBUG", message);
  }

  info(message) {
    this.#write("INFO", message);
  }

  warn(message) {
    this.#write("WARN", message);
  }

  error(message) {
    this.#write("ERROR", message);
  }
}

export const logger = new Logger();
