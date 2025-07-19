-- Insert sample data for testing

INSERT INTO components (name, status, last_maintenance, next_maintenance) VALUES
('Ball Screw X-Axis', 'warning', '2024-06-01', '2024-07-01'),
('LM Guideway Y-Axis', 'good', '2024-06-15', '2024-07-15'),
('Tool Magazine', 'critical', '2024-05-20', '2024-06-20');

INSERT INTO sensor_data (component_id, vibration, temperature, noise) VALUES
(1, 8.5, 75.2, 82.3),
(1, 9.1, 76.8, 84.1),
(2, 3.2, 65.5, 68.9),
(2, 2.8, 64.3, 67.2),
(3, 12.4, 95.7, 98.5),
(3, 13.1, 97.2, 99.8);

INSERT INTO alerts (component_id, message, level) VALUES
(1, 'High vibration detected', 'warning'),
(3, 'Critical temperature threshold exceeded', 'critical'),
(3, 'Excessive noise levels', 'warning');

INSERT INTO service_logs (component_id, service_type, notes) VALUES
(1, 'Routine Maintenance', 'Lubrication and calibration performed'),
(2, 'Inspection', 'All components within normal parameters'),
(3, 'Emergency Repair', 'Replaced worn components due to overheating');

INSERT INTO notification_recipients (name, email, chat_id, is_active) VALUES
('John Doe', 'john@example.com', '123456789', TRUE),
('Jane Smith', 'jane@example.com', '987654321', TRUE);
