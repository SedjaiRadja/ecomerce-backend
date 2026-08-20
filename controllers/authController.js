const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Vérification des champs
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires",
      });
    }

    // Vérification de l'utilisateur
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Cet email est déjà utilisé",
      });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création utilisateur
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Compte créé avec succès",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: "Utilisateur introuvable",
    });
  }

  const p = await bcrypt.compare(password, user.password);

  if (!p) {
    return res.status(401).json({
      message: "Email ou mot de passe incorrect",
    });
  }

  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
    },
    process.env.REFRESH_SECRET,
    {
      expiresIn: "7d",
    },
  );

  user.refreshToken = refreshToken;
  await user.save();

  res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    })
    .status(200)
    .json({
      message: "Connexion réussie",

      token: accessToken,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).send("no refresh token provided");
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const id = decoded.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(401).send("no user exist");
    }

    if (user.refreshToken !== refreshToken) {
      return res.status(401).send("");
    }
    const newAccessToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "5m",
      },
    );
    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(401).send("Invalid or expired refresh token");
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).send("no refresh token provided");
  }
  const user = await User.findOne({ refreshToken });
  if (!user) {
    return res.status(401).send("no user");
  }
  user.refreshToken = null;
  await user.save();
  res.status(200).send("you logged out");
};

module.exports = { register, login, refresh, logout };
