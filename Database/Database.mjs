import mysql from "mysql2/promise"; // mysql2 with Promise support — allows async/await instead of callbacks
import Config from "../Utils/Config.mjs";
import { logger } from "../Utils/Logger.mjs";

const schema = `
CREATE TABLE IF NOT EXISTS Customer (
    userId VARCHAR(36) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Courrier (
    userId VARCHAR(36) PRIMARY KEY,
    phoneNumber VARCHAR(20) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS RestaurantManager (
    userId VARCHAR(36) PRIMARY KEY,
    restaurantName VARCHAR(100) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Restaurant (
    restaurantId VARCHAR(36) PRIMARY KEY,
    restaurantName VARCHAR(100) NOT NULL,
    managerId VARCHAR(36) NOT NULL,
    FOREIGN KEY (managerId) REFERENCES RestaurantManager(userId)
);

CREATE TABLE IF NOT EXISTS MenuItem (
    itemId VARCHAR(36) PRIMARY KEY,
    restaurantId VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    FOREIGN KEY (restaurantId) REFERENCES Restaurant(restaurantId)
);

CREATE TABLE IF NOT EXISTS \`Order\` (
    orderId VARCHAR(36) PRIMARY KEY,
    customerId VARCHAR(36) NOT NULL,
    restaurantId VARCHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (customerId) REFERENCES Customer(userId),
    FOREIGN KEY (restaurantId) REFERENCES Restaurant(restaurantId)
);

CREATE TABLE IF NOT EXISTS OrderItem (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId VARCHAR(36) NOT NULL,
    itemName VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    UNIQUE KEY uq_order_item (orderId, itemName),
    FOREIGN KEY (orderId) REFERENCES \`Order\`(orderId)
);

CREATE TABLE IF NOT EXISTS DeliveryAssignment (
    assignmentId VARCHAR(36) PRIMARY KEY,
    orderId VARCHAR(36) NOT NULL,
    courierId VARCHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (orderId) REFERENCES \`Order\`(orderId),
    FOREIGN KEY (courierId) REFERENCES Courrier(userId)
);

CREATE TABLE IF NOT EXISTS Session (
    token VARCHAR(64) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL,
    userEmail VARCHAR(100),
    restaurantName VARCHAR(100),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

export default class Database {
  static #DBInstance = null; // holds the single shared instance — null means not yet created
  static #isConstructing = false; // guard flag to allow internal construction only via getInstance()
  #pool = null; // the mysql2 connection pool — private to this instance

  constructor() {
    if (!Database.#isConstructing) {
      throw new Error(
        "Database is a singleton. Use Database.getInstance() instead of new Database().",
      ); // prevents external code from calling new Database() directly
    }
  }

  async #connect() {
    const config = Config.getInstance();
    this.#pool = mysql.createPool({
      host: config.dbHost, // database server address — read from config
      port: config.dbPort, // database port — read from config
      user: config.dbUser, // database username — read from config
      password: config.dbPassword, // database password — read from config
      database: config.dbName, // database/schema name — read from config
      waitForConnections: true, // queue requests when all connections are busy
      connectionLimit: config.dbConnLimit, // max number of simultaneous connections
      queueLimit: config.dbQueueLimit, // max number of queued requests (0 = unlimited)
      multipleStatements: true,
    });
    logger.info("Connection pool established.");
    try {
      // This only works if multipleStatements: true is set in the mysql2 config
      await this.#pool.query(schema);
      logger.info("All tables are ready.");
    } catch (err) {
      logger.error("Runtime Schema Error");
      logger.error(err);
    }
  }

  static getInstance() {
    if (Database.#DBInstance === null) {
      logger.info("Creating a new Database instance");
      Database.#isConstructing = true; // temporarily unlocks the constructor
      Database.#DBInstance = new Database(); // creates the one and only instance
      Database.#isConstructing = false; // locks the constructor again
      Database.#DBInstance.#connect(); // creates the connection pool on the instance
    }
    return Database.#DBInstance; // always returns the same instance (Singleton guarantee)
  }

  async query(sql, params) {
    return await this.#pool.execute(sql, params); // executes a parameterized SQL query — params prevent SQL injection
  }
}
