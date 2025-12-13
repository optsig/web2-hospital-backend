import cors from "cors";
import mysql from "mysql";

import express from "express";

const app = express();

app.listen(5000, () => {
  console.log("server initialized...-");
});

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "hospital",
});

// app.get("/getusers", (req, res) => {
//   const q = "SELECT * FROM users";
//   db.query(q, (err, data) => {
//     if (err) {
//       return res.status(500).json(err);
//     } else {
//       return res.status(200).json(data);
//     }
//   });
// });

//todo: add check fields endpoint for the register page and call it on the onLeave event 
//todo(if there's time): hash the password before saving it in the db

app.post("/adduser", (req, res) => {
  if (
    !req.body.username || req.body.username === undefined ||
    !req.body.password || req.body.password === undefined
  ) {
    return res.status(400).send("Please fill out the fields");
  }
  const q =
    "INSERT INTO `users` (`username`, `password`, `role_id`) VALUES (?, ? , ?)";
  const { username, password } = req.body;
  db.query(q, [username, password, 3], (err, data) => {
    if (err) {
      if (err.errno === 1062) {
        return res.status(418).send(err.sqlMessage);
      }
      return res.status(500).json(err);
    } else {
      return res.status(201).json(data);
    }
  });
});

app.post("/verifyuser", (req, res) => {
  if (
    !req.body.username || req.body.username === undefined ||
    !req.body.password || req.body.password === undefined
  ) {
    return res.status(400).send("Please fill out the fields");
  }

  const { username, password } = req.body
  const q = `SELECT * FROM users WHERE username = ? AND password = ?`;
  db.query(q, [username, password], (err, data) => {
    if (err) {
      return res.status(500).json(err);
    } else {
      if (data.length === 0) {
        return res.status(404).send("user not found");
      }
      return res.status(200).json(data);
    }
  })
})