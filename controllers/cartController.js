const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

/*
|--------------------------------------------------------------------------
| ADD PRODUCT TO CART
|--------------------------------------------------------------------------
*/

const addProductToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    // Check product ID
    if (!productId) {
      return res.status(400).send("Product ID is required");
    }

    // Check quantity
    if (
      quantity === undefined ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).send("Quantity must be a positive integer");
    }

    // Check MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Check stock
    if (product.stock <= 0) {
      return res.status(400).send("Product is out of stock");
    }

    if (quantity > product.stock) {
      return res.status(400).send("Not enough stock available");
    }

    // Find user's cart
    let cart = await Cart.findOne({ user: userId });

    /*
    |--------------------------------------------------------------------------
    | CREATE NEW CART
    |--------------------------------------------------------------------------
    */

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [
          {
            product: productId,
            quantity,
          },
        ],
      });

      // Populate product information
      await cart.populate("items.product");

      return res.status(201).json({
        message: "Product added to cart successfully",
        cart,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUCT ALREADY IN CART
    |--------------------------------------------------------------------------
    */

    const cartItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;

      if (newQuantity > product.stock) {
        return res.status(400).send("Not enough stock available");
      }

      cartItem.quantity = newQuantity;
    } else {
      /*
      |--------------------------------------------------------------------------
      | PRODUCT NOT IN CART
      |--------------------------------------------------------------------------
      */

      cart.items.push({
        product: productId,
        quantity,
      });
    }

    await cart.save();

    // Populate product information
    await cart.populate("items.product");

    return res.status(200).json({
      message: "Product added to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(500).send("Failed to add product to cart");
  }
};

/*
|--------------------------------------------------------------------------
| GET CART
|--------------------------------------------------------------------------
*/

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      model: "Product",
      select: "_id name description price image category stock",
    });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }

    console.log("POPULATED CART:", JSON.stringify(cart, null, 2));

    return res.status(200).json(cart);
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(500).send("Failed to fetch cart");
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE CART QUANTITY
|--------------------------------------------------------------------------
*/

const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    // Check product ID
    if (!productId) {
      return res.status(400).send("Product ID is required");
    }

    // Check quantity
    if (
      quantity === undefined ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).send("Quantity must be a positive integer");
    }

    // Check MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    // Find cart
    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }

    // Find product inside cart
    const cartItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (!cartItem) {
      return res.status(404).send("Product not found in cart");
    }

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Check stock
    if (product.stock <= 0) {
      return res.status(400).send("Product is out of stock");
    }

    if (quantity > product.stock) {
      return res.status(400).send("Not enough stock available");
    }

    // Update quantity
    cartItem.quantity = quantity;

    await cart.save();

    // Populate product information
    await cart.populate("items.product");

    return res.status(200).json({
      message: "Cart quantity updated successfully",
      cart,
    });
  } catch (error) {
    console.error("Update cart error:", error);

    return res.status(500).send("Failed to update cart");
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE PRODUCT FROM CART
|--------------------------------------------------------------------------
*/

const removeProductToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    // Check product ID
    if (!productId) {
      return res.status(400).send("Product ID is required");
    }

    // Check MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    // Find cart
    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }

    // Find product index
    const productIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (productIndex === -1) {
      return res.status(404).send("Product not found in cart");
    }

    // Remove product
    cart.items.splice(productIndex, 1);

    await cart.save();

    // Populate product information
    await cart.populate("items.product");

    return res.status(200).json({
      message: "Product removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    return res.status(500).send("Failed to remove product from cart");
  }
};

/*
|--------------------------------------------------------------------------
| CLEAR CART
|--------------------------------------------------------------------------
*/

const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find cart
    const cart = await Cart.findOne({
      user: userId,
    });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }

    // Empty cart
    cart.items = [];

    await cart.save();

    // Populate product information
    await cart.populate("items.product");

    return res.status(200).json({
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);

    return res.status(500).send("Failed to clear cart");
  }
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  addProductToCart,
  getCart,
  updateCartQuantity,
  removeProductToCart,
  clearCart,
};
