import User from "./User.mjs"; // inherits the abstract User base class
import { v4 } from "uuid"; // generates a unique ID for each new courrier
import bcrypt from "bcrypt"; // handles password hashing and comparison
import { SALT_ROUNDS } from "../Utils/constants.mjs"; // shared bcrypt cost factor
import CourrierRepository from "../Database/CourrierRepository.mjs"; // data access layer for Courrier
import { revokeToken } from "../Utils/token.mjs";

export default class Courrier extends User {
  constructor(userId, phoneNumber) {
    super(userId); // calls User constructor — sets this.userId
    this.phoneNumber = phoneNumber; // couriers are identified by phone number
  }

  static async register(phoneNumber, password) {
    const repo = new CourrierRepository();
    const phoneExists = await repo.findByPhoneNumber(phoneNumber); // checks if this phone number is already registered
    if (phoneExists) return phoneExists; // returns existing account instead of creating a duplicate

    const userId = v4(); // generates a unique ID for this courrier
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS); // hashes the password before storing
    const newCourrier = new Courrier(userId, phoneNumber); // creates the in-memory Courrier instance
    await repo.createCourrier(userId, phoneNumber, hashedPassword); // persists the courrier to the DB
    return newCourrier;
  }

  static async login(phoneNumber, password) {
    const repo = new CourrierRepository();
    const account = await repo.findByPhoneNumber(phoneNumber); // looks up the courrier by phone number
    if (!account) throw new Error("Phone number not found"); // no account exists for this phone number

    const checkPassword = await bcrypt.compare(password, account.passwordHash); // compares input against stored hash
    if (!checkPassword) throw new Error("Wrong Password"); // hash does not match — reject login

    return account; // returns the DB row — contains userId needed for JWT
  }

  static async logout(req, res) {
    await revokeToken(req);
    res.setHeader("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0");
  }

}
