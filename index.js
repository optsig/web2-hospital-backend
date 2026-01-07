import 'dotenv/config'
import cors from "cors";
import mysql from "mysql2";

import express from "express";
import bcrypt from "bcrypt";


const app = express();

app.listen(5000, () => {
  console.log("server initialized...");
});

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database.');
});

//todo: add check fields endpoint for the register page and call it on the onLeave event 


//add user 
app.post("/adduser", async (req, res) => {

  if (!req.body) {
    return res.status(400).json({ error: "Request body is missing" })
  }

  const { username, password, firstName, lastName } = req.body

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
    }
    const userId = data.insertId
    const patientQ = "INSERT INTO patients (first_name, last_name, user_id) VALUES (?, ?, ?)"
    db.query(patientQ, [firstName, lastName, userId], (err, data) => {
      if (err) {
        return res.status(500).json({ error: err });
      }
      return res.status(201).json({ message: "user created successfully" })
    })
  });
});

//verify user 

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
      return res.status(200).json({ message: "user verified", name: user.username, role_id: user.role_id, user_id: user.id });
    }
  })
})

//get doctors

app.get("/getdoctors", (req, res) => {
  const q = "SELECT * FROM doctors";

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    } else {
      if (data.length === 0) {
        return res.status(204).send("No doctors found");
      }
      return res.status(200).json(data);
    }
  });
})

//delete doctor
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
        return res.status(404).json({ message: "doctor not found", type: "doctor_not_found" })
      }
      const userId = data[0].user_id
      const deleteUserQuery = "DELETE FROM users WHERE id = ?"
      db.query(deleteUserQuery, [userId], (err, data) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err });
        }
        else {
          if (data.affectedRows === 0) {
            return res.status(404).json({ message: "no user account for this doctor found", type: "doctor_user_not_found" })
          }
          else if (data.affectedRows === 1) {
            return res.status(200).json({ message: "doctor deleted successfully" })
          }
        }
      })
    }
  })


})


// add doctor
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

//get nb of appointments
app.get("/getnumberofappointments", (req, res) => {
  const q = "SELECT COUNT(*) AS count FROM appointments"
  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(200).json({ count: data[0].count });
  })
})

//get nb of patients
app.get("/getnumberofpatients", (req, res) => {
  const q = "SELECT COUNT(*) AS count FROM patients"
  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(200).json({ count: data[0].count });
  })
})

//get availabilities
app.get("/getavailabilities", (req, res) => {
  const q = `
  SELECT a.id, a.availability_date, a.availability_time,
  d.first_name, d.last_name, d.specialty 
  FROM availability a 
  JOIN doctors d ON d.id = a.doctor_id WHERE a.is_booked = FALSE
  `

  db.query(q, (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    else {
      if (data.length === 0) {
        return res.status(204).send("No availabilities found");
      }
      return res.status(200).json(data);
    }
  });
})

// get appointments
app.get("/getappointments/:userid", (req, res) => {
  const userId = req.params.userid
  const q = `
  SELECT ap.id,
  a.availability_date, a.availability_time,
  d.first_name, d.last_name, d.specialty
  FROM users u 
  JOIN patients p ON p.user_id = u.id
  JOIN appointments ap ON ap.patient_id = p.id
  JOIN availability a ON a.id = ap.availability_id
  JOIN doctors d ON d.id = ap.doctor_id
  WHERE u.id = ?
  `
  db.query(q, [userId], (err, data) => {
    if (err) {

      return res.status(500).json({ message: "Database error", error: err });
    }
    else {
      if (data.length === 0) {
        return res.status(204).send("No appointments found for this user");
      }
      return res.status(200).json(data)
    }
  })

})

//book appointment
app.post("/bookappointment", (req, res) => {
  const { userId, availabilityId } = req.body;

  if (userId === undefined || availabilityId === undefined) {
    return res.status(400).json({ message: "userId and availabilityId are required" });
  }

  const getPatientQ = "SELECT id FROM patients WHERE user_id = ?";
  db.query(getPatientQ, [userId], (err, patientData) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (patientData.length === 0) {
      console.log("DEBUG: No patient found for userId:", userId);
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientId = patientData[0].id;

    const getAvailQ = "SELECT doctor_id, is_booked FROM availability WHERE id = ?";
    db.query(getAvailQ, [availabilityId], (err, availData) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      if (availData.length === 0) {
        return res.status(404).json({ message: "availability not found" });
      }
      if (availData[0].is_booked) {
        return res.status(409).json({ message: "availability already booked" });
      }
      const doctorId = availData[0].doctor_id;

      const insertApptQ = "INSERT INTO appointments (patient_id, doctor_id, availability_id) VALUES (?, ?, ?)";
      db.query(insertApptQ, [patientId, doctorId, availabilityId], (err, data) => {
        if (err) {
          return res.status(500).json({ message: "Error creating appointment", error: err });
        }
        const updateAvailQ = "UPDATE availability SET is_booked = true WHERE id = ?";
        db.query(updateAvailQ, [availabilityId], (err) => {
          if (err) {
            return res.status(500).json({ message: "Error updating availability", error: err });
          }
          return res.status(201).json({ message: "Appointment booked successfully" });
        });
      });
    });
  });
});

//cancel appointment(patient)
app.delete("/appointments/:appointmentId", (req, res) => {
  const { appointmentId } = req.params;

  const getApptIdQ = "SELECT availability_id FROM appointments WHERE id = ?";
  db.query(getApptIdQ, [appointmentId], (err, data) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (data.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    const availabilityId = data[0].availability_id;

    const deleteApptQ = "DELETE FROM appointments WHERE id = ?";
    db.query(deleteApptQ, [appointmentId], (err) => {
      if (err) {
        return res.status(500).json({ message: "Error deleting appointment", error: err });
      }
      const updateAvailQ = "UPDATE availability SET is_booked = FALSE WHERE id = ?";
      db.query(updateAvailQ, [availabilityId], (err) => {
        if (err) {
          return res.status(500).json({ message: "Error updating availability", error: err });
        }
        return res.status(200).json({ message: "Appointment canceled successfully" });
      });
    });
  });
});

//get availabilities(doctor)
app.get("/getdoctoravailabilities/:userId", (req, res) => {
  const { userId } = req.params;

  const getDoctorQ = "SELECT id FROM doctors WHERE user_id = ?";
  db.query(getDoctorQ, [userId], (err, doctorData) => {
    if (err) {
      return res.status(500).json(err);
    }
    if (doctorData.length === 0) {
      return res.status(404).json({ message: "doctor not found" });
    }
    const doctorId = doctorData[0].id;

    const getAvailQ = "SELECT id, availability_date, availability_time, is_booked FROM availability WHERE doctor_id = ?"


    db.query(getAvailQ, [doctorId], (err, data) => {
      if (err) {
        return res.status(500).json(err);
      }
      if (data.length === 0) {
        return res.status(204).send("no availabilities found for this doctor");
      }
      res.status(200).json(data);
    });
  });
});

//add doctor's availability
app.post("/addavailability", (req, res) => {
  const { userId, date, time } = req.body;

  const getDoctorQ = "SELECT id FROM doctors WHERE user_id = ?";
  db.query(getDoctorQ, [userId], (err, doctorData) => {
    if (err) {
      return res.status(500).json(err);
    }
    if (doctorData.length === 0) {
      return res.status(404).json({ message: "doctor not found" });
    }
    const doctorId = doctorData[0].id;

    const insertQ = "INSERT INTO availability (availability_date, availability_time, doctor_id, is_booked) VALUES (?, ?, ?, false)"

    db.query(insertQ, [date, time, doctorId], (err) => {
      if (err) {
        if (err.errno === 1062) {
          return res.status(400).json({ message: "duplicate entry", error: err.sqlMessage })
        }
        return res.status(500).json(err);
      }
      res.status(201).json({ message: "availability added" });
    });
  });
});

//delete doctor's availability
app.delete("/deleteavailability/:availabilityId", (req, res) => {
  const { availabilityId } = req.params;

  const checkQ = "SELECT is_booked FROM availability WHERE id = ?";
  db.query(checkQ, [availabilityId], (err, data) => {
    if (err) {
      return res.status(500).json(err);
    }
    if (data.length === 0) {
      return res.status(404).json({ message: "availability not found" });
    }
    if (data[0].is_booked) {
      return res.status(409).json({ message: "availability already booked" });
    }
    const deleteQ = "DELETE FROM availability WHERE id = ?";
    db.query(deleteQ, [availabilityId], (err) => {
      if (err) {
        return res.status(500).json(err);
      }
      res.status(200).json({ message: "availability deleted" });
    });
  });
});

//get doctor's appointments
app.get("/getdoctorappointments/:userId", (req, res) => {
  const { userId } = req.params;

  const getDoctorQ = "SELECT id FROM doctors WHERE user_id = ?";
  db.query(getDoctorQ, [userId], (err, doctorData) => {
    if (err) {
      return res.status(500).json(err);
    }
    if (doctorData.length === 0) {
      return res.status(404).json({ message: "doctor not found" });
    }
    const doctorId = doctorData[0].id;

    const apptQ = `
      SELECT a.id,
      p.first_name,p.last_name,
      av.availability_date,av.availability_time
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN availability av ON a.availability_id = av.id
      WHERE a.doctor_id = ?
    `;

    db.query(apptQ, [doctorId], (err, data) => {
      if (err) {
        return res.status(500).json(err);
      }
      if (data.length === 0) {
        return res.status(204).send("no appointments found for this doctor");
      }
      res.status(200).json(data);
    });
  });
});

//delete doctor's appointment
app.delete("/deleteappointment/:appointmentId", (req, res) => {
  const { appointmentId } = req.params;

  const getQ = "SELECT availability_id FROM appointments WHERE id = ?";
  db.query(getQ, [appointmentId], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length === 0)
      return res.status(404).json({ message: "appointment not found" });

    const availabilityId = data[0].availability_id;

    const deleteQ = "DELETE FROM appointments WHERE id = ?";
    db.query(deleteQ, [appointmentId], (err) => {
      if (err) return res.status(500).json(err);

      const updateQ =
        "UPDATE availability SET is_booked = false WHERE id = ?";
      db.query(updateQ, [availabilityId], (err) => {
        if (err) return res.status(500).json(err);
        res.status(200).json({ message: "appointment canceled" });
      });
    });
  });
});

//update doctor's availability
app.put("/updateavailability/:availabilityId", async (req, res) => {
  const { availabilityId } = req.params;
  const { date, time } = req.body;

  const q = "UPDATE availability SET availability_date = ?, availability_time = ? WHERE id = ? AND is_booked = false"
  db.query(q, [date, time, availabilityId], (err, data) => {
    if (err) {
      if (err.errno === 1062) {
        return res.status(400).json({ message: err.sqlMessage });
      }
      return res.status(500).json({ message: "Database error", error: err });
    } else {
      if (data.affectedRows === 0) {
        return res.status(404).json({ message: "availability not found" });
      }
      return res.status(200).json({ message: "availability updated successfully" });
    }
  });
});
