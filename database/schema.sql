-- SQLite Database Schema for Arrest Records System

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    name TEXT PRIMARY KEY UNIQUE NOT NULL,
    value TEXT NULL
);

-- Insert initial settings
INSERT OR IGNORE INTO settings (name, value) VALUES
('cron_schedule', '30 10 * * *'),
('background_worker_count', '1'),
('bg_worker_count', '1'),
('everyday_worker_count', '1'),
('fta_names', '["FTA", "FAIL TO APPEAR", "FAILURE TO APPEAR"]'),
('headless', 'false');

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

INSERT OR IGNORE INTO states (name, url, priority, status) VALUES
('Alabama', 'https://alabama.arrests.org',1,0),
('Arkansas', 'https://arkansas.arrests.org',2,0),
('Arizona', 'https://arizona.arrests.org',3,0),
('California', 'https://california.arrests.org',4,0),
('Colorado', 'https://colorado.arrests.org',5,0),
('Florida', 'https://florida.arrests.org',6,1),
('Georgia', 'https://georgia.arrests.org',7,0),
('Indiana', 'https://indiana.arrests.org',8,0),
('Iowa', 'https://iowa.arrests.org',9,0),
('Idaho', 'https://idaho.arrests.org',10,0),
('Illinois', 'https://illinois.arrests.org',11,0),
('Kentucky', 'https://kentucky.arrests.org',12,0),
('Kansas', 'https://kansas.arrests.org',13,0),
('Louisiana', 'https://louisiana.arrests.org',14,0),
('Maine', 'https://maine.arrests.org',15,0),
('Maryland', 'https://maryland.arrests.org',16,0),
('Michigan', 'https://michigan.arrests.org',17,0),
('Minnesota', 'https://minnesota.arrests.org',18,0),
('Missouri', 'https://missouri.arrests.org',19,0),
('Mississippi', 'https://mississippi.arrests.org',20,0),
('Montana', 'https://montana.arrests.org',21,0),
('Nebraska', 'https://nebraska.arrests.org',22,0),
('Nevada', 'https://nevada.arrests.org',23,0),
('New Hampshire', 'https://newhampshire.arrests.org',24,0),
('New Jersey', 'https://newjersey.arrests.org',25,0),
('New Mexico', 'https://newmexico.arrests.org',26,0),
('New York', 'https://newyork.arrests.org',27,0),
('North Carolina', 'https://northcarolina.arrests.org',28,0),
('North Dakota', 'https://northdakota.arrests.org',29,0),
('Oklahoma', 'https://oklahoma.arrests.org',30,0),
('Ohio', 'https://ohio.arrests.org',31,0),
('Oregon', 'https://oregon.arrests.org',32,0),
('Pennsylvania', 'https://pennsylvania.arrests.org',33,0),
('South Carolina', 'https://southcarolina.arrests.org',34,0),
('Tennessee', 'https://tennessee.arrests.org',35,0),
('Texas', 'https://texas.arrests.org',36,0),
('Utah', 'https://utah.arrests.org',37,0),
('Virginia', 'https://virginia.arrests.org',38,0),
('West Virginia', 'https://westvirginia.arrests.org',39,0),
('Wisconsin', 'https://wisconsin.arrests.org',40,0),
('Wyoming', 'https://wyoming.arrests.org',41,0);

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
    worker_id INTEGER DEFAULT NULL,
    fta_status INTEGER DEFAULT 0,
    FOREIGN KEY (agency_id) REFERENCES agency(id),
    FOREIGN KEY (county_id) REFERENCES county(id),
    FOREIGN KEY (state_id) REFERENCES states(id),
    FOREIGN KEY (batch_id) REFERENCES batch(id)
);
-- Records Charges Detail Table
CREATE TABLE IF NOT EXISTS record_charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT NULL,
    statute TEXT DEFAULT NULL,
    bond TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    record_id INTEGER DEFAULT NULL,
    FOREIGN KEY (record_id) REFERENCES records(id),
    CONSTRAINT unique_record_id_name UNIQUE (record_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_records_arrest_datetime ON records(arrest_datetime);
CREATE INDEX IF NOT EXISTS idx_records_agency_id ON records(agency_id);
CREATE INDEX IF NOT EXISTS idx_records_county_id ON records(county_id);
CREATE INDEX IF NOT EXISTS idx_records_state_id ON records(state_id);
CREATE INDEX IF NOT EXISTS idx_records_batch_id ON records(batch_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_fta_status ON records(fta_status);
CREATE INDEX IF NOT EXISTS idx_records_worker_id ON records(worker_id);
CREATE INDEX IF NOT EXISTS idx_record_charges_record_id ON record_charges(record_id);