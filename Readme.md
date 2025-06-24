# Arrest Records Management System

A complete Node.js Express application with SQLite database for managing arrest records with dashboard analytics and CSV export functionality.

## Features

- **SQLite Database** with proper schema and foreign key relationships
- **Dashboard Page** with total records count and configurable settings
- **Records Page** with advanced filtering and search capabilities
- **CSV Export** functionality with applied filters
- **Background Script** for automated record insertion
- **Responsive Web Interface** with Bootstrap styling

## Database Schema

### Tables:
1. **settings** - System configuration (fetch_until, fetched_until dates)
2. **county** - County reference data
3. **agency** - Law enforcement agency reference data  
4. **charges** - Criminal charges reference data
5. **records** - Main arrest records with foreign key relationships

## Installation

1. **Clone/Download** the project files
2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Initialize Database**:
   ```bash
   # The database will be created automatically when you start the app
   # Or manually initialize with:
   npm run init-db
   ```

4. **Start the Application**:
   ```bash
   npm start
   # Or for development with auto-restart:
   npm run dev
   ```

5. **Access the Application**:
   - Open your browser to `http://localhost:3000`

## Project Structure

```
arrest-records-system/
├── app.js                 # Main Express application
├── schema.sql            # Database schema file
├── background-updater.js  # Background script for record insertion
├── package.json          # Dependencies and scripts
├── views/
│   ├── dashboard.ejs     # Dashboard page template
│   └── records.ejs       # Records page template
└── arrest_records.db     # SQLite database (created automatically)
```

## Usage

### Dashboard Page (`/`)
- View total records count
- Update "Fetch Until" date setting
- View "Fetched Until" timestamp (updated by background script)
- Real-time stats refresh

### Records Page (`/records`)
- **Search Filters**:
  - Date range (start/end dates)  
  - County selection
  - Agency selection
  - Charge type selection
- **Features**:
  - Paginated results (100 records max per page)
  - CSV export with applied filters
  - Clickable external URLs
  - Charge badges display

### CSV Export
- Export button applies current search filters
- Downloads file with timestamp: `arrest_records_YYYY-MM-DD.csv`
- Includes all record fields with readable reference names

## Background Script Usage

The `RecordUpdater` class provides methods for automated record insertion:

```javascript
const RecordUpdater = require('./background-updater');

async function insertRecords() {
    const updater = new RecordUpdater();
    
    // Example record data
    const rawRecord = {
        name: "John Doe",
        arrest_datetime: "2024-01-15 14:30:00",
        agency_name: "Houston Police Department",
        county_name: "Harris County", 
        charge_names: ["DWI", "Public Intoxication"],
        bond: 2500.00,
        url: "https://example.com/record/123",
        arrest_id: "HPD2024001"
    };
    
    // Process and insert (creates agencies/counties/charges as needed)
    const result = await updater.processAndInsertRecord(rawRecord);
    
    // Update fetched timestamp
    await updater.updateFetchedUntil(new Date().toISOString());
    
    updater.close();
}
```

### Key Methods:
- `processAndInsertRecord(rawRecord)` - Insert record with string references
- `insertRecord(recordData)` - Insert record with ID references  
- `insertRecords(records)` - Batch insert multiple records
- `getOrCreateAgency(name)` - Get/create agency by name
- `getOrCreateCounty(name)` - Get/create county by name
- `getOrCreateCharge(name)` - Get/create charge by name
- `updateFetchedUntil(datetime)` - Update last fetched timestamp

## API Endpoints

- `GET /` - Dashboard page
- `GET /records` - Records page with filtering
- `GET /export-csv` - CSV export with filters
- `POST /update-fetch-until` - Update fetch until setting
- `GET /api/stats` - JSON stats for AJAX updates

## Data Format

### Record Structure:
```javascript
{
    name: "Full Name",
    arrest_datetime: "2024-01-15 14:30:00", 
    agency_name: "Police Department Name",
    county_name: "County Name",
    charge_names: ["Charge 1", "Charge 2"],
    bond: 2500.00,
    url: "https://source-url.com",
    arrest_id: "UNIQUE_ID"
}
```

### Charges Storage:
- Stored as JSON array of charge IDs in database
- Example: `[1, 3, 5]` for charge IDs 1, 3, and 5
- Automatically converted to/from charge names in UI

## Error Handling

- Duplicate `arrest_id` records are automatically skipped
- Missing reference data (agencies, counties, charges) is created automatically
- Failed insertions are logged with details
- Database connection errors are handled gracefully

## Development

- Use `npm run dev` for development with nodemon auto-restart
- Database file: `arrest_records.db` (SQLite)
- Templates use EJS for server-side rendering
- Bootstrap 5 for responsive UI styling
- Font Awesome icons included

## Notes

- The system handles up to 100 records per page for performance
- All timestamps stored in SQLite datetime format
- Foreign key constraints ensure data integrity
- Indexes created for optimal query performance
- CSV export includes human-readable names vs IDs