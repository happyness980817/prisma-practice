import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

router.post("/register", (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  // save the new user and hashed password to the database
  try {
    const insertUser = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`);
    const result = insertUser.run(username, hashedPassword);

    // now that we have a user, I want to add their first todo item for them
    const defaultTodo = `Hello, ${username}! Welcome to Todo List!`;
    const insertTodo = db.prepare(`INSERT INTO todos (user_id, task) VALUES (?, ?)`);
    insertTodo.run(result.lastInsertRowid, defaultTodo);

    const token = jwt.sign(
      {
        userId: result.lastInsertRowid,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token });
  } catch (err) {
    console.log(err.message);
    res.sendStatus(503);
  }
});

router.post("/login", (req, res) => {
  // we get their email, and we look up the password associated with that email in the database
  const { username, password } = req.body;
  try {
    const getUser = db.prepare(`SELECT * FROM users WHERE username = ?`);
    const user = getUser.get(username);

    // user verification
    if (!user) {
      res.status(401).send({ message: "User not found" });
      return;
    }

    // password verification
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      res.status(401).send({ message: "Invalid password" });
      return;
    }
    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token });
  } catch (err) {
    console.log(err.message);
    res.sendStatus(503);
  }
});

export default router;
