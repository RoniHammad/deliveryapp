import Config from "./Utils/Config.mjs";
import { logger } from "./Utils/Logger.mjs";
import http from "node:http"; // built-in Node.js module to create HTTP servers — no framework needed
import { appRouter } from "./Controllers/AppRouter.mjs"; // imports the main dispatch function that handles all incoming requests

const config = Config.getInstance();
const PORT = config.port; // reads the PORT value from the validated config

const server = await http.createServer(appRouter); // creates the HTTP server and hands every request to appRouter

server.listen(PORT, () => {
  logger.info(`Server running on PORT:${PORT}`); // confirms the server is up and which port it's bound to
});

// ---- MISSING ----
// await is unnecessary on http.createServer() — it is synchronous, not a Promise
