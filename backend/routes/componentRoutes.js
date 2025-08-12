// routes/componentRoutes.js
const express = require("express")
const router = express.Router()
const db = require("../db")

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM components")
    res.json(rows)
  } catch (error) {
    console.error("DB error:", error)
    res.status(500).json({ error: "Failed to fetch components" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM components WHERE id = ?", [req.params.id])
    if (rows.length === 0) {
      return res.status(404).json({ error: "Component not found" })
    }
    res.json(rows[0])
  } catch (error) {
    console.error("DB error:", error)
    res.status(500).json({ error: "Failed to fetch component" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { name, status = 'good', last_maintenance = null, next_maintenance = null, machine_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: "'name' is required" });
    }
    if (!machine_id) {
      return res.status(400).json({ error: "'machine_id' is required" });
    }

    // 🔹 Validate dates if both are provided
    if (last_maintenance && next_maintenance) {
      const lastDate = new Date(last_maintenance);
      const nextDate = new Date(next_maintenance);

      if (nextDate <= lastDate) {
        return res.status(400).json({ error: "Next Maintenance date must be after Last Maintenance date" });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO components (name, status, last_maintenance, next_maintenance, machine_id) VALUES (?, ?, ?, ?, ?)`,
      [name, status, last_maintenance, next_maintenance, machine_id]
    );

    const [rows] = await db.execute("SELECT * FROM components WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);

  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Next Maitenance Date is not valid" });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM components WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('DB error:', error);
    res.status(500).json({ error: 'Failed to delete component' });
  }
});

module.exports = router
