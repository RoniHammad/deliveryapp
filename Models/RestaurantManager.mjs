import User from "./User.mjs"; // inherits the abstract User base class
import { v4 } from "uuid"; // generates a unique ID for each new manager
import bcrypt from "bcrypt"; // handles password hashing and comparison
import { SALT_ROUNDS } from "../Utils/constants.mjs"; // shared bcrypt cost factor
import RestaurantManagerRepository from "../Database/RestaurantManagerRepository.mjs"; // data access layer for RestaurantManager
import { revokeToken } from "../Utils/token.mjs";
import { logger } from "../Utils/Logger.mjs";

export default class RestaurantManager extends User {
  constructor(userId, restaurantName) {
    super(userId); // calls User constructor — sets this.userId
    this.restaurantName = restaurantName; // managers are tied to a specific restaurant
  }

  static async register(restaurantName, password) {
    const repo = new RestaurantManagerRepository();
    const exists = await repo.findByRestaurantName(restaurantName); // checks if this restaurant name is already registered
    if (exists) return exists; // returns existing account instead of creating a duplicate
    logger.debug("Manager name not in use");

    const userId = v4(); // generates a unique ID for this manager
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS); // hashes the password before storing
    const newManager = new RestaurantManager(userId, restaurantName); // creates the in-memory RestaurantManager instance
    await repo.createManager(userId, restaurantName, hashedPassword); // persists the manager to the DB
    return newManager;
  }

  static async login(restaurantName, password) {
    const repo = new RestaurantManagerRepository();
    const account = await repo.findByRestaurantName(restaurantName); // looks up the manager by restaurant name
    if (!account) throw new Error("Restaurant not found"); // no account exists for this restaurant name

    const checkPassword = await bcrypt.compare(password, account.passwordHash); // compares input against stored hash
    if (!checkPassword) throw new Error("Wrong Password"); // hash does not match — reject login

    return account; // returns the DB row — contains userId needed for JWT
  }

  static async logout(req, res) {
    await revokeToken(req);
    res.setHeader("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0");
  }
}
