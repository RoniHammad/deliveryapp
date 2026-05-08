import Customer from "../Models/Customer.mjs"; // Customer model — handles register and login logic
import { errorController } from "./ErrorController.mjs"; // sends error HTML pages on failure
import { HTTP_STATUS, UserRoles } from "../Utils/constants.mjs"; // role constants — used as JWT payload value
import { parseBody } from "../Utils/bodyParser.mjs"; // reads and decodes the POST request body
import { issueToken } from "../Utils/token.mjs";

export const authController = {
  // handles POST /auth/register — creates a new customer account and logs them in
  register: async (req, res) => {
    try {
      const { userEmail, password } = await parseBody(req); // extracts email and password from the form submission
      const customer = await Customer.register(userEmail, password); // creates the customer in the DB (hashes password internally)
      await issueToken(res, customer, UserRoles.CUSTOMER);
      res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/home" });
      res.end();
    } catch {
      errorController(HTTP_STATUS.BAD_REQUEST, req, res); // sends 400 error page if registration fails (e.g. email already in use)
    }
  },

  // handles POST /auth/login — verifies credentials and issues a JWT cookie
  login: async (req, res) => {
    try {
      const { userEmail, password } = await parseBody(req); // extracts email and password from the form submission
      const customer = await Customer.login(userEmail, password); // verifies email exists and password matches the stored hash
      await issueToken(res, customer, UserRoles.CUSTOMER);
      res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/home" });
      res.end();
    } catch {
      errorController(HTTP_STATUS.UNAUTHORIZED, req, res); // sends 401 error page if credentials are wrong
    }
  },

  logout: async (req, res) => {
    await Customer.logout(req, res);
    res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/login" });
    res.end();
  },
};
