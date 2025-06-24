-- SQLite Database Schema for Arrest Records System

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    name TEXT PRIMARY KEY UNIQUE NOT NULL,
    value TEXT NULL
);

-- Insert initial settings
INSERT OR IGNORE INTO settings (name, value) VALUES 
('fetch_until', ''),
('processing_date', ''),
('headless', 'false'),
('fetched_until', '');

-- States Table
CREATE TABLE IF NOT EXISTS states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 1,
    processing_status INTEGER NOT NULL DEFAULT 0
);
-- processing_status 0 => pending, 1 => processing, 2 => completed

INSERT OR IGNORE INTO states (name, url, priority) VALUES
('Alabama', 'https://alabama.arrests.org',1),
('Arkansas', 'https://arkansas.arrests.org',2),
('Arizona', 'https://arizona.arrests.org',3),
('California', 'https://california.arrests.org',4),
('Colorado', 'https://colorado.arrests.org',5),
('Florida', 'https://florida.arrests.org',6),
('Georgia', 'https://georgia.arrests.org',7),
('Indiana', 'https://indiana.arrests.org',8),
('Iowa', 'https://iowa.arrests.org',9),
('Idaho', 'https://idaho.arrests.org',10),
('Illinois', 'https://illinois.arrests.org',11),
('Kentucky', 'https://kentucky.arrests.org',12),
('Kansas', 'https://kansas.arrests.org',13),
('Louisiana', 'https://louisiana.arrests.org',14),
('Maine', 'https://maine.arrests.org',15),
('Maryland', 'https://maryland.arrests.org',16),
('Michigan', 'https://michigan.arrests.org',17),
('Minnesota', 'https://minnesota.arrests.org',18),
('Missouri', 'https://missouri.arrests.org',19),
('Mississippi', 'https://mississippi.arrests.org',20),
('Montana', 'https://montana.arrests.org',21),
('Nebraska', 'https://nebraska.arrests.org',22),
('Nevada', 'https://nevada.arrests.org',23),
('New Hampshire', 'https://newhampshire.arrests.org',24),
('New Jersey', 'https://newjersey.arrests.org',25),
('New Mexico', 'https://newmexico.arrests.org',26),
('New York', 'https://newyork.arrests.org',27),
('North Carolina', 'https://northcarolina.arrests.org',28),
('North Dakota', 'https://northdakota.arrests.org',29),
('Oklahoma', 'https://oklahoma.arrests.org',30),
('Ohio', 'https://ohio.arrests.org',31),
('Oregon', 'https://oregon.arrests.org',32),
('Pennsylvania', 'https://pennsylvania.arrests.org',33),
('South Carolina', 'https://southcarolina.arrests.org',34),
('Tennessee', 'https://tennessee.arrests.org',35),
('Texas', 'https://texas.arrests.org',36),
('Utah', 'https://utah.arrests.org',37),
('Virginia', 'https://virginia.arrests.org',38),
('West Virginia', 'https://westvirginia.arrests.org',39),
('Wisconsin', 'https://wisconsin.arrests.org',40),
('Wyoming', 'https://wyoming.arrests.org',41);

-- County table
CREATE TABLE IF NOT EXISTS county (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- Agency table
CREATE TABLE IF NOT EXISTS agency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- Charges table
CREATE TABLE IF NOT EXISTS charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    status INTEGER NOT NULL DEFAULT 0,
    chargecode INTEGER DEFAULT NULL
);

INSERT OR IGNORE INTO charges (name, status, chargecode) VALUES
('Unknown', 0, 0),
('Alcohol Violation', 0, 2),
('Assault / Battery', 0, 3),
('Boating', 0, 4),
('Burglary / Theft', 0, 5),
('Courts', 0, 24),
('Crimes Against Children', 0, 1),
('Crimes Against Families', 0, 6),
('Criminal Mischief', 0, 26),
('Disorderly', 0, 25),
('Domestic Violence', 0, 23),
('Drugs', 0, 21),
('DUI', 0, 7),
('Fraud', 0, 8),
('Homicide', 0, 9),
('Immigration', 0, 27),
('Indeceny', 0, 10),
('Loitering', 0, 11),
('Marijuana', 0, 22),
('Municipal', 0, 12),
('Obstructing Justice', 1, 13),
('Probation', 0, 14),
('Prostitution', 0, 15),
('Sex Crimes', 0, 16),
('Traffic', 0, 17),
('Trespassing', 0, 18),
('Weapons', 0, 19),
('Wildlife', 0, 20);


-- batch table
CREATE TABLE IF NOT EXISTS batch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    charges TEXT DEFAULT '[]',
    states TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    script_status TEXT DEFAULT 'pending',
    processing_charge_id INTEGER DEFAULT NULL,
    processing_state_id INTEGER DEFAULT NULL,
    processing_date TEXT DEFAULT NULL,
    worker_id INTEGER DEFAULT NULL
);

-- Records table
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT NULL,
    url TEXT UNIQUE NOT NULL,
    bond DECIMAL(10,2) DEFAULT 0,
    arrest_datetime DATETIME DEFAULT NULL,
    agency_id INTEGER DEFAULT NULL,
    county_id INTEGER DEFAULT NULL,
    charges TEXT DEFAULT NULL, -- JSON array of charge IDs
    state_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES agency(id),
    FOREIGN KEY (county_id) REFERENCES county(id),
    FOREIGN KEY (state_id) REFERENCES states(id),
    FOREIGN KEY (batch_id) REFERENCES batch(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_records_arrest_datetime ON records(arrest_datetime);
CREATE INDEX IF NOT EXISTS idx_records_agency_id ON records(agency_id);
CREATE INDEX IF NOT EXISTS idx_records_county_id ON records(county_id);
CREATE INDEX IF NOT EXISTS idx_records_state_id ON records(state_id);
CREATE INDEX IF NOT EXISTS idx_records_batch_id ON records(batch_id);