// routes/sensorRoutes.js
const express = require("express")
const router = express.Router()
console.log("Telegram Bot Token:", process.env.TELEGRAM_BOT_TOKEN ? "✅ Present" : "❌ Missing");
console.log("First recipient chat_id:", process.env.TEST_CHAT_ID || "Not set");
const mysql = require('mysql2');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'smart_maintenance',
}).promise();
const TelegramBot = require("node-telegram-bot-api")
const nodemailer = require("nodemailer")

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  logger: true,
  debug: true,
})

// Store recent alerts in memory (you can move this to database later)
const alertTracker = new Map()

// Configuration
const ALERT_CONFIG = {
  consecutiveThreshold: 3, // Number of consecutive alerts needed
  emailEscalationThreshold: 3, // Send email on 3rd alert
  timeWindowMinutes: 15, // Time window in minutes
  cooldownMinutes: 0.05, // Cooldown period before sending another alert
}

// POST /api/sensors/data
router.post("/data", async (req, res) => {
  console.log('Received sensor data:', req.body);
  const { component_id, vibration, temperature, noise } = req.body

  if (!component_id || vibration == null || temperature == null || noise == null) {
    return res.status(400).json({ error: "Missing or invalid data" })
  }

  try {
    // Store the sensor data
    await db.execute(`INSERT INTO sensor_data (component_id, vibration, temperature, noise) VALUES (?, ?, ?, ?)`, [
      component_id,
      vibration,
      temperature,
      noise,
    ])

    // Broadcast to WebSocket clients if broadcastSensorData function is available
    if (typeof global.broadcastSensorData === 'function') {
      global.broadcastSensorData(component_id, {
        vibration,
        temperature,
        noise,
        timestamp: new Date().toISOString()
      });
    }

    // Check thresholds and track alerts
    const alerts = []
    const currentTime = new Date()

    // Check each sensor type
    if (vibration > 7.0) {
      alerts.push({
        type: "vibration",
        message: "⚠️ High vibration",
        value: vibration,
        threshold: 8.0,
      })
    }

    if (temperature > 75) {
      alerts.push({
        type: "temperature",
        message: "🔥 High temperature",
        value: temperature,
        threshold: 80,
      })
    }

    if (noise > 65) {
      alerts.push({
        type: "noise",
        message: "🔊 High noise level",
        value: noise,
        threshold: 85,
      })
    }

    // Process each alert
    for (const alert of alerts) {
      // Store in database
      console.log("DEBUG - Alert object:", alert);

      await db.execute(
        
        `INSERT INTO alerts (component_id,alert_type, message, level, sensor_value, threshold_value) VALUES (?, ?, ?, ?, ?,?)`,
        [
          component_id,
          alert.type,
          alert.message,
          "Warning",
          alert.value,
          alert.threshold // <-- this is the breached value
        ]
        
      )

      // Check if we should send notifications
      await checkAndSendAlerts(component_id, alert, currentTime)
    }

    res.status(201).json({
      message: "Sensor data saved successfully",
      alertsTriggered: alerts.length,
      alerts: alerts.map((a) => a.message),
    })
  } catch (error) {
    console.error("Sensor insert error:", error)
    res.status(500).json({ error: "Failed to save sensor data" })
  }
})

// Function to check consecutive alerts and send notifications
async function checkAndSendAlerts(componentId, alert, currentTime) {
  const alertKey = `${componentId}_${alert.type}`

  // Initialize tracker for this component/sensor type
  if (!alertTracker.has(alertKey)) {
    alertTracker.set(alertKey, {
      alerts: [],
      lastNotificationSent: null,
      alertCount: 0,
    })
  }

  const tracker = alertTracker.get(alertKey)

  // Add current alert to tracker
  tracker.alerts.push({
    time: currentTime,
    value: alert.value,
    threshold: alert.threshold,
  })

  // Remove old alerts outside time window
  const timeWindowMs = ALERT_CONFIG.timeWindowMinutes * 60 * 1000
  tracker.alerts = tracker.alerts.filter((alertItem) => currentTime - alertItem.time < timeWindowMs)

  console.log(`🔍 Alert tracking for ${alertKey}:`, {
    currentAlerts: tracker.alerts.length,
    alertCount: tracker.alertCount,
    lastNotificationSent: tracker.lastNotificationSent,
    timeWindow: ALERT_CONFIG.timeWindowMinutes,
  })

  // Check if we have enough consecutive alerts
  if (tracker.alerts.length >= ALERT_CONFIG.consecutiveThreshold) {
    // Check cooldown period
    const cooldownMs = ALERT_CONFIG.cooldownMinutes * 60 * 1000
    const canSendNotification = !tracker.lastNotificationSent || currentTime - tracker.lastNotificationSent > cooldownMs

    console.log(`🚦 Notification check for ${alertKey}:`, {
      canSendNotification,
      cooldownMs,
      timeSinceLastNotification: tracker.lastNotificationSent
        ? currentTime - tracker.lastNotificationSent
        : "No previous notification",
    })

    if (canSendNotification) {
      // Increment alert count BEFORE sending notifications
      tracker.alertCount++
      console.log(`🚀 Sending alert #${tracker.alertCount} for ${alertKey}`)

      // Always send Telegram first
      await sendTelegramAlert(componentId, alert, tracker.alerts, tracker.alertCount)

      // Send email if this is the 2nd alert
      if (tracker.alertCount >= 2) {
        await sendEmailAlert(componentId, alert, tracker.alerts, tracker.alertCount)
        console.log(`📧 Email escalation triggered for ${componentId}_${alert.type}`)
      }

      // Update last notification time
      tracker.lastNotificationSent = currentTime

      // Reset alerts array but keep the counter
      tracker.alerts = []

      // Keep the alert count - DO NOT reset it
      console.log(`✅ Alert cycle completed for ${alertKey}. Alert count: ${tracker.alertCount}`)
    } else {
      console.log(`⛔ Cooldown active for ${alertKey}. Skipping alert.`)
    }
  } else {
    console.log(
      `⏳ Not enough consecutive alerts for ${alertKey}: ${tracker.alerts.length}/${ALERT_CONFIG.consecutiveThreshold}`,
    )
  }
}

// Function to send Telegram alert (HARDCODED VERSION)
async function sendTelegramAlert(componentId, alert, recentAlerts, alertCount) {
  try {
    // Get component name
    const componentResult = await db.execute("SELECT name FROM components WHERE id = ?", [componentId]);
    const componentRows = Array.isArray(componentResult[0]) ? componentResult[0] : componentResult;
    const componentName = componentRows[0]?.name || `Component ${componentId}`;

    // Create alert message
    const alertMessage = createTelegramMessage(componentName, alert, recentAlerts, alertCount);

    // Hardcoded recipients - much simpler!
    const telegramRecipients = [
      process.env.TEST_CHAT_ID, // Your chat ID from environment variable
      // Add more chat IDs here if needed
    ].filter(Boolean); // Remove any undefined/null values

    if (telegramRecipients.length === 0) {
      console.log("⚠️ No Telegram recipients configured");
      return;
    }

    // Send to all configured recipients
    for (const chatId of telegramRecipients) {
      try {
        const numericChatId = Number(chatId);
        if (isNaN(numericChatId)) {
          console.error(`❌ Invalid chat_id format: ${chatId}`);
          continue;
        }

        console.log(`📤 Sending to chat_id: ${numericChatId}`);
        await bot.sendMessage(numericChatId, alertMessage);
        console.log(`✅ Telegram alert sent to chat_id: ${numericChatId}`);
      } catch (error) {
        console.error(`❌ Failed to send Telegram alert to chat_id ${chatId}:`, error.message);
      }
    }

    console.log(`🚨 Telegram alert #${alertCount} sent for ${componentName} - ${alert.type}`);
  } catch (error) {
    console.error("Error sending Telegram alert:", error);
  }
}

// Function to send email alert
// Function to send email alert (HARDCODED VERSION)
async function sendEmailAlert(componentId, alert, recentAlerts, alertCount) {
  try {
    // Get component name
    const componentResult = await db.execute("SELECT name FROM components WHERE id = ?", [componentId])
    const componentRows = Array.isArray(componentResult[0]) ? componentResult[0] : componentResult;
    const componentName = componentRows[0]?.name || `Component ${componentId}`

    // Create email content
    const { subject, html, text } = createEmailContent(componentName, alert, recentAlerts, alertCount)

    // Hardcoded email recipients - much simpler!
    const emailRecipients = [
      process.env.GMAIL_USER, // Send to yourself as backup
      // Add more email addresses here if needed
    ].filter(Boolean); // Remove any undefined/null values

    if (emailRecipients.length === 0) {
      console.log("⚠️ No email recipients configured");
      return;
    }

    // Send to all configured recipients
    for (const email of emailRecipients) {
      try {
        await emailTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: email,
          subject: subject,
          text: text,
          html: html,
        })
        console.log(`📨 Email alert sent to: ${email}`)
      } catch (error) {
        console.error(`❌ Failed to send email alert to ${email}:`, error.message)
      }
    }

    console.log(`📧 Email escalation sent for ${componentName} - ${alert.type}`)
  } catch (error) {
    console.error("Error sending email alert:", error)
  }
}

// Alternative approach using promises (if you prefer)
async function sendTelegramAlertAlternative(componentId, alert, recentAlerts, alertCount) {
  try {
    // Get component name
    const componentName = await new Promise((resolve, reject) => {
      db.query("SELECT name FROM components WHERE id = ?", [componentId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.name || `Component ${componentId}`);
      });
    });

    // Create alert message
    const alertMessage = createTelegramMessage(componentName, alert, recentAlerts, alertCount)

    // Get notification recipients
    const recipients = await new Promise((resolve, reject) => {
      db.query(
        "SELECT chat_id FROM notification_recipients WHERE is_active = 1 AND chat_id IS NOT NULL",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log("DEBUG: Notification recipients:", recipients);

    if (!Array.isArray(recipients) || recipients.length === 0) {
      console.log("⚠️ No active Telegram recipients found");
      return;
    }

    // Send to all active recipients
    for (const recipient of recipients) {
      try {
        if (!recipient.chat_id) {
          console.log("⚠️ Recipient has no chat_id:", recipient);
          continue;
        }

        await bot.sendMessage(recipient.chat_id, alertMessage)
        console.log(`✅ Telegram alert sent to chat_id: ${recipient.chat_id}`)
      } catch (error) {
        console.error(`❌ Failed to send Telegram alert to chat_id ${recipient.chat_id}:`, error.message)
      }
    }

    console.log(`🚨 Telegram alert #${alertCount} sent for ${componentName} - ${alert.type}`)
  } catch (error) {
    console.error("Error sending Telegram alert:", error)
  }
}



// Function to create Telegram message
function createTelegramMessage(componentName, alert, recentAlerts, alertCount) {
  const latestAlert = recentAlerts[recentAlerts.length - 1]

  let icon = "⚠️"
  if (alert.type === "temperature") icon = "🔥"
  if (alert.type === "noise") icon = "🔊"
  if (alert.type === "vibration") icon = "📳"

  let escalationNote = ""
  if (alertCount >= ALERT_CONFIG.emailEscalationThreshold) {
    escalationNote = "\n🚨 EMAIL ESCALATION TRIGGERED!"
  }

  return `🚨 SENSOR ALERT #${alertCount} ${icon}

📍 Component: ${componentName}
📊 Sensor: ${alert.type.toUpperCase()}
📈 Current Value: ${latestAlert.value}
⚡ Threshold: ${latestAlert.threshold}
🔄 Consecutive Alerts: ${recentAlerts.length}
🕐 Time: ${new Date().toLocaleString()}${escalationNote}

⚠️ This alert was triggered after ${ALERT_CONFIG.consecutiveThreshold} consecutive threshold breaches within ${ALERT_CONFIG.timeWindowMinutes} minutes.

Please check the system immediately!`
}

// Function to create email content
function createEmailContent(componentName, alert, recentAlerts, alertCount) {
  const latestAlert = recentAlerts[recentAlerts.length - 1]

  const subject = `🚨 CRITICAL SENSOR ALERT #${alertCount} - ${componentName}`

  const text = `CRITICAL SENSOR ALERT - ESCALATION LEVEL

Component: ${componentName}
Sensor Type: ${alert.type.toUpperCase()}
Current Value: ${latestAlert.value}
Threshold: ${latestAlert.threshold}
Alert Count: ${alertCount}
Time: ${new Date().toLocaleString()}

This is alert #${alertCount} for this component. Email escalation has been triggered.

IMMEDIATE ACTION REQUIRED!

Previous alerts were sent via Telegram. Please check the system immediately.`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ff4444; border-radius: 10px; background-color: #fff5f5;">
      <h1 style="color: #ff4444; text-align: center;">🚨 CRITICAL SENSOR ALERT</h1>
      
      <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #d32f2f; margin-top: 0;">Alert #${alertCount} - ESCALATION LEVEL</h2>
        <p><strong>Component:</strong> ${componentName}</p>
        <p><strong>Sensor Type:</strong> ${alert.type.toUpperCase()}</p>
        <p><strong>Current Value:</strong> ${latestAlert.value}</p>
        <p><strong>Threshold:</strong> ${latestAlert.threshold}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <div style="background-color: #ff5722; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <h3 style="margin: 0;">IMMEDIATE ACTION REQUIRED!</h3>
        <p style="margin: 10px 0;">This is alert #${alertCount} for this component.</p>
        <p style="margin: 10px 0;">Email escalation has been triggered.</p>
      </div>
      
      <p style="color: #666;">Previous alerts were sent via Telegram. Please check the system immediately to prevent potential damage or safety issues.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
        <p>This alert was generated by your IoT Sensor Monitoring System.</p>
      </div>
    </div>
  `

  return { subject, text, html }
}

// Monthly maintenance check function
async function checkMonthlyMaintenance() {
  try {
    const componentsResult = await db.execute(`
      SELECT c.id, c.name, 
             MAX(sl.serviced_at) as last_service,
             DATEDIFF(CURDATE(), MAX(sl.serviced_at)) as days_since_service
      FROM components c
      LEFT JOIN service_logs sl ON c.id = sl.component_id
      GROUP BY c.id, c.name
      HAVING days_since_service >= 30 OR last_service IS NULL
    `)
    
    const components = Array.isArray(componentsResult[0]) ? componentsResult[0] : componentsResult;

    for (const component of components) {
      await sendMaintenanceEmail(component)
    }

    console.log(`📅 Monthly maintenance check completed. ${components.length} components need service.`)
  } catch (error) {
    console.error("Error checking monthly maintenance:", error)
  }
}

// Function to send maintenance email
async function sendMaintenanceEmail(component) {
  try {
    const subject = `🔧 Monthly Maintenance Required - ${component.name}`

    const daysSince = component.days_since_service || "Never"
    const lastService = component.last_service
      ? new Date(component.last_service).toLocaleDateString()
      : "No service recorded"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ff9800; border-radius: 10px; background-color: #fff8e1;">
        <h1 style="color: #ff9800; text-align: center;">🔧 Monthly Maintenance Required</h1>
        
        <div style="background-color: #ffecb3; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #f57c00; margin-top: 0;">Component: ${component.name}</h2>
          <p><strong>Last Service:</strong> ${lastService}</p>
          <p><strong>Days Since Service:</strong> ${daysSince}</p>
          <p><strong>Status:</strong> Maintenance Required</p>
        </div>
        
        <div style="background-color: #ff9800; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0;">SCHEDULE MAINTENANCE</h3>
          <p style="margin: 10px 0;">This component requires monthly maintenance.</p>
        </div>
        
        <p style="color: #666;">Please schedule maintenance for this component to ensure optimal performance and prevent potential issues.</p>
      </div>
    `

    const text = `Monthly Maintenance Required

Component: ${component.name}
Last Service: ${lastService}
Days Since Service: ${daysSince}

Please schedule maintenance for this component.`

    // Hardcoded email recipients for maintenance
    const maintenanceRecipients = [
      process.env.GMAIL_USER, // Send to yourself
      // Add more email addresses here if needed
    ].filter(Boolean); // Remove any undefined/null values

    // Send to all configured recipients
    for (const email of maintenanceRecipients) {
      try {
        await emailTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: email,
          subject: subject,
          text: text,
          html: html,
        })
        console.log(`📨 Maintenance email sent to: ${email}`)
      } catch (error) {
        console.error(`❌ Failed to send maintenance email to ${email}:`, error)
      }
    }
  } catch (error) {
    console.error("Error sending maintenance email:", error)
  }
}

// Run monthly maintenance check daily at 9 AM
setInterval(() => {
  const now = new Date()
  if (now.getHours() === 9 && now.getMinutes() === 0) {
    checkMonthlyMaintenance()
  }
}, 60000) // Check every minute

// GET /api/sensors/data

// GET /api/sensors/data
router.get("/data", async (req, res) => {
  try {
    const { component_id } = req.query;
    const query = "SELECT * FROM sensor_data WHERE component_id = ? ORDER BY timestamp DESC LIMIT 100";
    const [rows] = await db.execute(query, [component_id]);
    res.json(rows);
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sensors/alerts (existing endpoint)
router.get("/alerts", async (req, res) => {
  try {
    const rowsResult = await db.execute(`
      SELECT a.id, c.name AS component_name, a.message, a.level, a.created_at
      FROM alerts a
      JOIN components c ON a.component_id = c.id
      ORDER BY a.created_at DESC
      LIMIT 20
    `)
    
    const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;

    res.json(rows)
  } catch (error) {
    console.error("Alert fetch error:", error)
    res.status(500).json({ error: "Failed to fetch alerts" })
  }
})

// GET latest sensor data for a component
router.get("/latest/:component_id", (req, res) => {
  const component_id = req.params.component_id;

  const query = 'SELECT * FROM sensor_data WHERE component_id = ? ORDER BY timestamp DESC LIMIT 1';
  db.query(query, [component_id], (err, rows) => {
    if (err) {
      console.error("Sensor data fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch sensor data" });
    }

    if (rows.length === 0) {
      // Return default values if no sensor data exists
      return res.json({
        id: null,
        component_id: parseInt(component_id),
        vibration: 0,
        temperature: 0,
        noise: 0,
        timestamp: new Date().toISOString()
      });
    }

    res.json(rows[0]);
  });
});

// GET sensor limits for a component
router.get("/limits/:component_id", (req, res) => {
  const component_id = req.params.component_id;

  const query = 'SELECT * FROM sensor_limits WHERE component_id = ?';
  db.query(query, [component_id], (err, rows) => {
    if (err) {
      console.error("Sensor limits fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch sensor limits" });
    }

    if (rows.length === 0) {
      // Return default limits if not found
      return res.json({
        temperature_max: 80,
        vibration_max: 5,
        noise_max: 85
      });
    }

    res.json(rows[0]);
  });
});

// PUT sensor limits for a component
router.put("/limits/:component_id", (req, res) => {
  const component_id = req.params.component_id;
  const { temperature_max, vibration_max, noise_max } = req.body;

  if (!temperature_max || !vibration_max || !noise_max) {
    return res.status(400).json({ error: "Missing required fields: temperature_max, vibration_max, noise_max" });
  }

  // Check if limits exist for this component
  const checkQuery = 'SELECT * FROM sensor_limits WHERE component_id = ?';
  db.query(checkQuery, [component_id], (err, rows) => {
    if (err) {
      console.error("Sensor limits check error:", err);
      return res.status(500).json({ error: "Failed to check sensor limits" });
    }

    if (rows.length > 0) {
      // Update existing limits
      const updateQuery = 'UPDATE sensor_limits SET temperature_max = ?, vibration_max = ?, noise_max = ? WHERE component_id = ?';
      db.query(updateQuery, [temperature_max, vibration_max, noise_max, component_id], (err, result) => {
        if (err) {
          console.error("Sensor limits update error:", err);
          return res.status(500).json({ error: "Failed to update sensor limits" });
        }
        res.json({ message: "Sensor limits updated successfully" });
      });
    } else {
      // Insert new limits
      const insertQuery = 'INSERT INTO sensor_limits (component_id, temperature_max, vibration_max, noise_max) VALUES (?, ?, ?, ?)';
      db.query(insertQuery, [component_id, temperature_max, vibration_max, noise_max], (err, result) => {
        if (err) {
          console.error("Sensor limits insert error:", err);
          return res.status(500).json({ error: "Failed to insert sensor limits" });
        }
        res.status(201).json({ message: "Sensor limits created successfully" });
      });
    }
  });
});
router.post("/test-telegram", async (req, res) => {
  try {
    await bot.sendMessage(6571456440, "Test message from backend");
    res.json({ success: true, message: "Test message sent" });
  } catch (error) {
    console.error("Telegram test error:", error);
    res.status(500).json({ error: "Failed to send test message" });
  }
});
// Test endpoint to send a test alert
router.post("/test-alert", async (req, res) => {
  try {
    const testAlert = {
      type: "test",
      message: "🧪 Test alert",
      value: 999,
      threshold: 100,
    }

    await sendTelegramAlert("test_component", testAlert, [{ time: new Date(), value: 999, threshold: 100 }], 1)

    res.json({ message: "Test Telegram alert sent!" })
  } catch (error) {
    console.error("Test alert error:", error)
    res.status(500).json({ error: "Failed to send test alert" })
  }
})

// Test endpoint for email alert
router.post("/test-email", async (req, res) => {
  try {
    const testAlert = {
      type: "test",
      message: "📧 Test email alert",
      value: 999,
      threshold: 100,
    }

    await sendEmailAlert("test_component", testAlert, [{ time: new Date(), value: 999, threshold: 100 }], 3)

    res.json({ message: "Test email alert sent!" })
  } catch (error) {
    console.error("Test email error:", error)
    res.status(500).json({ error: "Failed to send test email" })
  }
})

// Test endpoint for maintenance email
router.post("/test-maintenance", async (req, res) => {
  try {
    const testComponent = {
      id: "test",
      name: "Test Component",
      last_service: "2024-06-01",
      days_since_service: 35,
    }

    await sendMaintenanceEmail(testComponent)
    res.json({ message: "Test maintenance email sent!" })
  } catch (error) {
    console.error("Test maintenance error:", error)
    res.status(500).json({ error: "Failed to send test maintenance email" })
  }
})

// GET /api/sensors/sensor-values/:component_id
router.get("/sensor-values/:component_id", async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM sensor_data WHERE component_id = ? ORDER BY timestamp DESC LIMIT 100',
      [req.params.component_id]
    );
    res.json(rows); // ✅ Only send rows, not the whole result object
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET latest reading from sensor_readings
router.get("/latest-reading", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1"
    );
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "No data found" });
    }
  } catch (err) {
    console.error("Error fetching latest reading:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router
