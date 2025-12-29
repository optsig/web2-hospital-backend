import cors from "cors";
import mysql from "mysql";

import express from "express";
import bcrypt from "bcrypt";


const app = express();

app.listen(5000, () => {
  console.log("server initialized...");
});

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "hospital",
});

//todo: add check fields endpoint for the register page and call it on the onLeave event 

app.post("/adduser", async (req, res) => {

  if (!req.body) {
    return res.status(400).json({ error: "Request body is missing" })
  }

  const { username, password } = req.body

  const errors = []
  if (!username) {
    errors.push("Username required")
  }
  if (!password) {
    errors.push("password required")
  }
  if (errors.length > 0) {
    return res.status(400).json({ error: errors });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const q =
    "INSERT INTO `users` (`username`, `password`, `role_id`) VALUES (?, ? , ?)";
  db.query(q, [username, hashedPassword, 3], (err, data) => {
    if (err) {
      if (err.errno === 1062) {
        return res.status(400).json({ error: err.sqlMessage });
      }
      return res.status(500).json({ error: err });
    } else {
      return res.status(201).json({
        message: "User created successfully",
        id: data.insertId
      });
    }
  });
});


app.post("/verifyuser", (req, res) => {

  const { username, password } = req.body

  const errors = []
  if (!username) {
    errors.push("username required")
  }
  if (!password) {
    errors.push("password required")
  }
  if (errors.length > 0) {
    return res.status(400).json({ message: "missing fields", error: errors })
  }
  const q = `SELECT * FROM users WHERE username = ?`;
  db.query(q, [username], async (err, data) => {
    if (err) {
      return res.status(500).json({ error: err });
    } else {
      if (data.length === 0) {
        return res.status(404).json({ error: "user not found" });
      }
      const user = data[0]
      const match = await bcrypt.compare(password, user.password)
      if (!match) {
        return res.status(401).json({ error: "invalid credentials" })
      }
      return res.status(200).json({ message: "user verified", name: user.username, id: user.role_id });
    }
  })
})


app.get("/getdoctors", (req, res) => {
  const q = "SELECT * FROM doctors";

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    } else {
      if (data.length === 0) {
        return res.status(204).send("No students found");
      }
      return res.status(200).json(data);
    }
  });
})