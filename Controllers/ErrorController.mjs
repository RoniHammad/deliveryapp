import fs from "node:fs"; // reads HTML files from disk
import path from "node:path"; // builds OS-safe file paths
import { fileURLToPath } from "node:url"; // converts import.meta.url to a file system path
import { logger } from "../Utils/Logger.mjs";

const __dirName = path.dirname(fileURLToPath(import.meta.url)); // resolves current directory (ESM equivalent of __dirname)

// maps each HTTP status code to its corresponding error view file
const errorPages = {
  400: "Error-BadRequestView.html",
  401: "Error-UnauthorizedView.html",
  404: "Error-NotFoundView.html",
  500: "Error-Server.html",
};

// reads and sends the matching error HTML page — called by Router on 404 and by any controller on error
export const errorController = async (statusCode, req, res) => {
  const file = errorPages[statusCode] ?? "Error-Server.html"; // falls back to 500 page for unknown status codes

  try {
    const html = await fs.promises.readFile(
      path.join(__dirName, `../Views/${file}`), // resolves absolute path to the view file
      "utf-8",
    );
    res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" }); // sets status code and HTML content type
    return res.end(html); // sends the HTML body and closes the response
  } catch (error) {
    logger.error(error); // logs the file read failure for debugging
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }); // fallback header if view file is missing
    return res.end("Internal Server Error"); // guarantees the client always receives a response
  }
};

