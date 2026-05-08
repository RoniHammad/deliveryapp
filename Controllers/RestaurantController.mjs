import { v4 } from "uuid";
import RestaurantManager from "../Models/RestaurantManager.mjs";
import DeliveryAssignment from "../Models/DeliveryAssignment.mjs";
import { errorController } from "./ErrorController.mjs";
import { HTTP_STATUS, UserRoles, OrderStatus } from "../Utils/constants.mjs";
import { parseBody } from "../Utils/bodyParser.mjs";
import { issueToken, verifyToken } from "../Utils/token.mjs";
import { renderHTML } from "../Utils/renderHTML.mjs";
import RestaurantRepository from "../Database/RestaurantRepository.mjs";
import OrderRepository from "../Database/OrderRepository.mjs";
import CourrierRepository from "../Database/CourrierRepository.mjs";

const restaurantRepo = new RestaurantRepository();
const orderRepo = new OrderRepository();
const courrierRepo = new CourrierRepository();

export const restaurantController = {
  // handles POST /restaurant/register — creates a new restaurant manager account and logs them in
  register: async (req, res) => {
    try {
      const { restaurantName, password } = await parseBody(req);
      const manager = await RestaurantManager.register(restaurantName, password);
      const existingRestaurant = await restaurantRepo.findByManagerId(manager.userId);
      if (!existingRestaurant) {
        await restaurantRepo.createRestaurant(v4(), restaurantName, manager.userId);
      }
      await issueToken(res, manager, UserRoles.MANAGER);
      res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/restaurant/dashboard" });
      res.end();
    } catch {
      errorController(HTTP_STATUS.BAD_REQUEST, req, res);
    }
  },

  // handles POST /restaurant/login — verifies credentials and issues a session cookie
  login: async (req, res) => {
    try {
      const { restaurantName, password } = await parseBody(req);
      const manager = await RestaurantManager.login(restaurantName, password);
      await issueToken(res, manager, UserRoles.MANAGER);
      res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/restaurant/dashboard" });
      res.end();
    } catch {
      errorController(HTTP_STATUS.UNAUTHORIZED, req, res);
    }
  },

  logout: async (req, res) => {
    await RestaurantManager.logout(req, res);
    res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/login" });
    res.end();
  },

  // handles GET /restaurant/dashboard — renders the manager dashboard with live menu and order data
  dashboard: async (req, res) => {
    try {
      const { userId, restaurantName } = await verifyToken(req);
      const restaurant = await restaurantRepo.findByManagerId(userId);
      let menuItems = "<li class='empty'>No menu items yet.</li>";
      let orders = "<li class='empty'>No pending orders.</li>";
      if (restaurant) {
        const items = await restaurantRepo.findMenuByRestaurantId(restaurant.restaurantId);
        if (items.length) {
          menuItems = items.map(i => `<li>${i.name} — $${Number(i.price).toFixed(2)}</li>`).join("");
        }
        const pendingOrders = await orderRepo.findByRestaurantId(restaurant.restaurantId);
        if (pendingOrders.length) {
          const couriers = await courrierRepo.findAll();
          const courierOptions = couriers.length
            ? couriers.map(c => `<option value="${c.userId}">${c.phoneNumber}</option>`).join("")
            : `<option disabled>No couriers registered</option>`;
          orders = pendingOrders.map(o => {
            const canAssign = o.status === OrderStatus.SUBMITTED;
            const assignForm = canAssign
              ? `<form method="POST" action="/order/assign" style="display:inline; margin-left:1rem;">
                   <input type="hidden" name="orderId" value="${o.orderId}" />
                   <select name="courierId">${courierOptions}</select>
                   <button type="submit">Assign Courier</button>
                 </form>`
              : "";
            return `<li>Order ${o.orderId} — <strong>${o.status}</strong>${assignForm}</li>`;
          }).join("");
        }
      }
      await renderHTML(res, "Dash-ManagerView.html", {
        restaurantName,
        orders,
        menuItems,
      });
    } catch {
      res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/restaurant/login" });
      res.end();
    }
  },

  // handles POST /restaurant/menu/add — adds a new item to the manager's restaurant menu
  addMenuItem: async (req, res) => {
    try {
      const { userId } = await verifyToken(req);
      const { name, price, description } = await parseBody(req);
      const restaurant = await restaurantRepo.findByManagerId(userId);
      if (!restaurant) return errorController(HTTP_STATUS.NOT_FOUND, req, res);
      const itemId = v4();
      await restaurantRepo.addMenuItem(itemId, restaurant.restaurantId, name, price, description);
      res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/restaurant/dashboard" });
      res.end();
    } catch {
      errorController(HTTP_STATUS.SERVER_ERROR, req, res);
    }
  },

  // handles POST /order/assign — assigns a courier to a submitted order and marks it Preparing
  assignCourier: async (req, res) => {
    try {
      const { userId } = await verifyToken(req);
      const { orderId, courierId } = await parseBody(req);
      const order = await orderRepo.findById(orderId);
      if (!order) return errorController(HTTP_STATUS.NOT_FOUND, req, res);
      const restaurant = await restaurantRepo.findByManagerId(userId);
      if (!restaurant || restaurant.restaurantId !== order.restaurantId) {
        return errorController(HTTP_STATUS.UNAUTHORIZED, req, res);
      }
      await DeliveryAssignment.create(orderId, courierId);
      await orderRepo.updateStatus(orderId, OrderStatus.PREPARING);
      res.writeHead(HTTP_STATUS.TEMP_REDIRECT, { Location: "/restaurant/dashboard" });
      res.end();
    } catch {
      errorController(HTTP_STATUS.SERVER_ERROR, req, res);
    }
  },
};
