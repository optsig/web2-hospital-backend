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
        return res.status(204).json({ message: "No doctors found" });
      }
      return res.status(200).json(data);
    }
  });
})

app.delete("/doctors/:id", (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "doctor ID is required" });
  }

  if (isNaN(Number(id))) {
    return res.status(400).json({ message: "doctor ID must be a number" });
  }

  const getUserIdQuery = "SELECT user_id FROM doctors WHERE id = ?"

  db.query(getUserIdQuery, [id], (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    else {
      if (data.length === 0) {
        return res.status(404).json({ message: "doctor not found" })
      }
      const userId = data[0].user_id
      const deleteUserQuery = "DELETE FROM users WHERE id = ?"
      db.query(deleteUserQuery, [userId], (err, data) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err });
        }
        else {
          if (data.affectedRows === 0) {
            return res.status(404).json({ message: "no user account for this doctor found" })
          }
          else if (data.affectedRows === 1) {
            return res.status(200).json({ message: "doctor deleted successfully" })
          }
        }
      })
    }
  })


})



app.post("/adddoctor", async (req, res) => {
  const { username, password, firstName, lastName, specialty } = req.body;

  const errors = [];
  if (!username) errors.push("Username required");
  if (!password) errors.push("Password required");
  if (!firstName) errors.push("First name required");
  if (!lastName) errors.push("Last name required");
  if (!specialty) errors.push("Specialty required");

  if (errors.length > 0) {
    return res.status(400).json({ error: errors });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userQuery = "INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)";
    db.query(userQuery, [username, hashedPassword, 2], (err, data) => {
      if (err) {
        if (err.errno === 1062) {
          return res.status(400).json({ message: err.sqlMessage, type: "duplicate_user" });
        }
        return res.status(500).json({ message: "error creating user", error: err });
      }

      const userId = data.insertId;

      const doctorQuery = "INSERT INTO doctors (user_id, first_name, last_name, specialty) VALUES (?, ?, ?, ?)";
      db.query(doctorQuery, [userId, firstName, lastName, specialty], (err, doctorData) => {
        if (err) {
          if (err.errno === 1062) {
            db.query("DELETE FROM users WHERE id = ?", [userId]);
            return res.status(400).json({
              message: err.sqlMessage, type: "duplicate_doctor",
            });
          }

          return res.status(500).json({ message: "error creating doctor", error: err });
        }


        return res.status(201).json({
          message: "Doctor created successfully",
          doctorId: doctorData.insertId,
          userId: userId
        });
      });
    });
  } catch (error) {
    return res.status(500).json({ message: "internal error", error: error });
  }
});

app.get("/getnumberofappointments", (req, res) => {
  const q = "SELECT COUNT(*) AS count FROM appointments"
  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(200).json({ count: data[0].count });
  })
})

app.get("/getnumberofpatients", (req, res) => {
  const q = "SELECT COUNT(*) AS count FROM patients"
  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(200).json({ count: data[0].count });
  })
})

app.get("/getavailabilities", (req, res) => {
  const q = "SELECT a.id, a.availability_date, a.availability_time, d.first_name, d.last_name, d.specialty FROM availability a JOIN doctors d ON d.id = a.doctor_id WHERE a.is_booked = FALSE";

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    } else {
      if (data.length === 0) {
        return res.status(204).json({ message: "No availabilities found" });
      }
      return res.status(200).json(data);
    }
  });
})
