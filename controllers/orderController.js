const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| CLIENT
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CREATE ORDER
|--------------------------------------------------------------------------
*/

const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      firstName,
      lastName,
      street,
      city,
      wilaya,
      phone,
    } = req.body.shippingAddress || {};

    /*
    |--------------------------------------------------------------------------
    | CHECK SHIPPING INFORMATION
    |--------------------------------------------------------------------------
    */

    if (
      !firstName ||
      !lastName ||
      !street ||
      !city ||
      !wilaya ||
      !phone
    ) {
      return res
        .status(400)
        .send("Complete shipping information is required");
    }

    /*
    |--------------------------------------------------------------------------
    | GET USER CART
    |--------------------------------------------------------------------------
    */

    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EMPTY CART
    |--------------------------------------------------------------------------
    */

    if (cart.items.length === 0) {
      return res
        .status(400)
        .send("Cannot create an order from an empty cart");
    }

    /*
    |--------------------------------------------------------------------------
    | PREPARE ORDER ITEMS
    |--------------------------------------------------------------------------
    */

    let totalPrice = 0;

    const orderItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product);

      /*
      |----------------------------------------------------------------------
      | PRODUCT NOT FOUND
      |----------------------------------------------------------------------
      */

      if (!product) {
        return res.status(404).send("Product not found");
      }

      /*
      |----------------------------------------------------------------------
      | CHECK STOCK
      |----------------------------------------------------------------------
      */

      if (product.stock <= 0) {
        return res.status(400).send(
          `${product.name} is out of stock`,
        );
      }

      if (item.quantity > product.stock) {
        return res.status(400).send(
          `Not enough stock available for ${product.name}`,
        );
      }

      /*
      |----------------------------------------------------------------------
      | CALCULATE PRICE
      |----------------------------------------------------------------------
      */

      const itemTotal = product.price * item.quantity;

      totalPrice += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE ORDER
    |--------------------------------------------------------------------------
    */

    const order = await Order.create({
      user: userId,

      items: orderItems,

      totalPrice,

      shippingAddress: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        street: street.trim(),
        city: city.trim(),
        wilaya: wilaya.trim(),
        phone: phone.trim(),
      },

      status: "pending",
    });

    /*
    |--------------------------------------------------------------------------
    | UPDATE STOCK
    |--------------------------------------------------------------------------
    */

    for (const item of cart.items) {
      const product = await Product.findById(item.product);

      if (!product) {
        continue;
      }

      product.stock -= item.quantity;

      await product.save();
    }

    /*
    |--------------------------------------------------------------------------
    | CLEAR CART
    |--------------------------------------------------------------------------
    */

    cart.items = [];

    await cart.save();

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).send("Failed to create order");
  }
};

/*
|--------------------------------------------------------------------------
| GET MY ORDERS
|--------------------------------------------------------------------------
*/

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({
      user: userId,
    })
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    if (orders.length === 0) {
      return res.status(404).send("No orders found");
    }

    return res.status(200).json({
      message: "Orders fetched successfully",
      orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error);

    return res.status(500).send("Failed to fetch orders");
  }
};

/*
|--------------------------------------------------------------------------
| GET MY ORDER
|--------------------------------------------------------------------------
*/

const getMyOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    }).populate("items.product", "name image price");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    return res.status(200).json({
      message: "Order fetched successfully",
      order,
    });
  } catch (error) {
    console.error("Get my order error:", error);

    return res.status(500).send("Failed to fetch order");
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL MY ORDER
|--------------------------------------------------------------------------
*/

const cancelMyOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .send("You cannot cancel this order");
    }

    order.status = "cancelled";

    await order.save();

    return res.status(200).json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return res.status(500).send("Failed to cancel order");
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET ALL ORDERS
|--------------------------------------------------------------------------
*/

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    if (orders.length === 0) {
      return res.status(404).send("There are no orders");
    }

    return res.status(200).json({
      message: "Orders fetched successfully",
      orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error);

    return res.status(500).send("Failed to fetch orders");
  }
};

/*
|--------------------------------------------------------------------------
| GET ORDER
|--------------------------------------------------------------------------
*/

const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate("items.product", "name image price");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    return res.status(200).json({
      message: "Order fetched successfully",
      order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).send("Failed to fetch order");
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE ORDER STATUS
|--------------------------------------------------------------------------
*/

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!status) {
      return res.status(400).send("Status is required");
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).send("Invalid status");
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    order.status = status;

    await order.save();

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res
      .status(500)
      .send("Failed to update order status");
  }
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrder,
  cancelMyOrder,
  getAllOrders,
  getOrder,
  updateOrderStatus,
};