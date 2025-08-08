// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "volunteers_list.json");

app.use(express.json());
app.use(express.static("public")); // Serve your frontend files from here

// Get all volunteers
app.get("/api/volunteers", (req, res) => {
  fs.readFile(DATA_FILE, "utf-8", (err, data) => {
    if (err) return res.status(500).send("Error reading file.");
    res.json(JSON.parse(data));
  });
});

// Add a new volunteer
app.post("/api/volunteers", (req, res) => {
  fs.readFile(DATA_FILE, "utf-8", (err, data) => {
    if (err) return res.status(500).send("Error reading file.");
    const volunteers = JSON.parse(data);
    const newVolunteer = { id: Date.now(), ...req.body };
    volunteers.push(newVolunteer);
    fs.writeFile(DATA_FILE, JSON.stringify(volunteers, null, 2), (err) => {
      if (err) return res.status(500).send("Error writing file.");
      res.status(201).json(newVolunteer);
    });
  });
});

// Update volunteer
app.put("/api/volunteers/:id", (req, res) => {
  const id = parseInt(req.params.id);
  fs.readFile(DATA_FILE, "utf-8", (err, data) => {
    if (err) return res.status(500).send("Error reading file.");
    let volunteers = JSON.parse(data);
    volunteers = volunteers.map((v) =>
      v.id === id ? { ...v, ...req.body } : v
    );
    fs.writeFile(DATA_FILE, JSON.stringify(volunteers, null, 2), (err) => {
      if (err) return res.status(500).send("Error writing file.");
      res.json({ message: "Volunteer updated" });
    });
  });
});

// Delete volunteer
app.delete("/api/volunteers/:id", (req, res) => {
  const id = parseInt(req.params.id);
  fs.readFile(DATA_FILE, "utf-8", (err, data) => {
    if (err) return res.status(500).send("Error reading file.");
    const volunteers = JSON.parse(data).filter((v) => v.id !== id);
    fs.writeFile(DATA_FILE, JSON.stringify(volunteers, null, 2), (err) => {
      if (err) return res.status(500).send("Error writing file.");
      res.json({ message: "Volunteer deleted" });
    });
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
