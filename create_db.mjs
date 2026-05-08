import mysql from "mysql2/promise";
import Config from "./Utils/Config.mjs";

async function createDB() {
  const config = Config.getInstance();
  // Connect without database
  const connection = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
  });
  await connection.execute("CREATE DATABASE IF NOT EXISTS food_delivery");
  await connection.end();
  console.log("Database created.");
}

createDB().catch(console.error);