# Smart Maintenance System

A full-stack IoT-based smart maintenance system with React frontend and Node.js backend for monitoring industrial equipment components.

## Features

- **Real-time Sensor Monitoring**: Track vibration, temperature, and noise levels
- **Alert System**: Automated notifications via Telegram and email
- **Maintenance Tracking**: Schedule and record maintenance activities
- **Component Management**: Add and monitor industrial components
- **Modern UI**: Responsive dashboard with real-time data visualization

## Project Structure

```
project-bolt-sb1-imt26pux/
├── project/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   └── services/       # API service layer
│   └── package.json
├── project/backend/         # Backend Node.js application
│   ├── routes/             # API routes
│   ├── models/             # Database models
│   └── package.json
└── package.json            # Root package.json for managing both apps
```

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- Telegram Bot Token (optional, for notifications)
- Gmail account (optional, for email notifications)

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd project && npm install

# Install backend dependencies
cd backend && npm install
```

### 2. Database Setup

1. Create a MySQL database named `smart_maintenance`
2. Run the SQL schema (see `project/backend/models/sql.js` for connection details)

### 3. Environment Configuration

Create a `.env` file in `project/backend/`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_maintenance

# Server Configuration
PORT=5000

# Telegram Bot Configuration (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=6571456440

# Email Configuration (optional)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password_here
```

### 4. Start the Application

#### Development Mode (Both Frontend and Backend)
```bash
npm run dev
```

#### Individual Services
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

#### Production Build
```bash
npm run build
npm start
```

## API Endpoints

### Components
- `GET /api/components` - Get all components
- `GET /api/components/:id` - Get specific component

### Sensors
- `GET /api/sensors/data` - Get sensor data
- `POST /api/sensors/data` - Post sensor data
- `GET /api/sensors/alerts` - Get alerts

### Maintenance
- `GET /api/maintenance` - Get maintenance records
- `POST /api/maintenance` - Create maintenance record

### Notifications
- `GET /api/notifications/recipients` - Get notification recipients
- `POST /api/notifications/recipients` - Add notification recipient

## Features

### Frontend
- **Dashboard**: Overview of all components with status indicators
- **Component Details**: Detailed view with sensor data, alerts, and maintenance history
- **Real-time Updates**: Live sensor data monitoring
- **Responsive Design**: Works on desktop and mobile devices

### Backend
- **Sensor Data Processing**: Collect and analyze sensor data
- **Alert System**: Automated notifications for critical conditions
- **Maintenance Scheduling**: Track maintenance activities
- **Database Integration**: MySQL database for data persistence

## Alert System

The system automatically monitors sensor data and sends alerts when thresholds are exceeded:

- **Vibration**: > 8.0 m/s²
- **Temperature**: > 80°C
- **Noise**: > 85 dB

Alerts are sent via:
1. Telegram Bot (immediate)
2. Email (escalation after multiple alerts)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support or questions, please open an issue in the repository. 

---

## 1. **Create a MySQL User and Database**

You can run these commands in your MySQL client (Workbench, DBeaver, or command line):

```sql
-- Create the database
CREATE DATABASE smart_maintenance;

-- Create a user (replace 'your_password' with a strong password)
CREATE USER 'smartuser'@'localhost' IDENTIFIED BY 'your_password';

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON smart_maintenance.* TO 'smartuser'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
```

---

## 2. **Sample SQL Schema File (`schema.sql`)**

Create a file named `schema.sql` and put this content in it:

```sql
-- Use the database
USE smart_maintenance;

-- Components table
CREATE TABLE IF NOT EXISTS components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    last_maintenance DATETIME,
    next_maintenance DATETIME
);

-- Sensor data table
CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    component_id INT,
    vibration FLOAT,
    temperature FLOAT,
    noise FLOAT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES components(id)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    component_id INT,
    message VARCHAR(255),
    level VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES components(id)
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    component_id INT,
    description VARCHAR(255),
    performed_by VARCHAR(100),
    performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    next_maintenance DATETIME,
    FOREIGN KEY (component_id) REFERENCES components(id)
);

-- Notification recipients table
CREATE TABLE IF NOT EXISTS notification_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    chat_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE
);
```

---

## 3. **How to Use**

1. **Open MySQL Workbench or your preferred client.**
2. **Connect as root or an admin user.**
3. **Run the SQL commands above to create the database and user.**
4. **Open and run the `schema.sql` file to create the tables.**

---

## 4. **Update Your `.env` File**

In your `backend/.env`:
```
DB_HOST=localhost
DB_USER=smartuser
DB_PASSWORD=your_password
DB_NAME=smart_maintenance
DB_PORT=3306
```

---

## 5. **Restart Your Backend**

After updating the `.env` file, restart your backend server.

---

Would you like me to create the `schema.sql` file in your project for you? If yes, I’ll add it to your `backend/` directory! 