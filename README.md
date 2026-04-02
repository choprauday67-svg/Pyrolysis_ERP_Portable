# Pyrolysis ERP - Portable Version

This is a portable version of the Pyrolysis ERP application that can run on any Windows computer with Node.js installed.

## Quick Start

1. **Extract the ZIP file** to any folder on your computer.

2. **Install Node.js** (if not already installed):
   - Download from https://nodejs.org/
   - Install the LTS version

3. **Run the application**:
   - Double-click `start.bat` in the extracted folder
   - Or open Command Prompt, navigate to the folder, and run `start.bat`

4. **Open your browser** and go to `http://localhost:5000`

## Default Login

- **Email**: admin@pyrolysis.com
- **Password**: admin123

The application includes sample data for testing.

## Features

- User authentication and authorization
- Inventory management
- Production tracking
- Sales management
- Expense tracking
- Dashboard with analytics
- Customer portal

## Database

The application uses SQLite database (`pyrolysis_erp.db`) which is included and portable.

## Troubleshooting

- If port 5000 is busy, edit `backend/.env` and change PORT
- Ensure Node.js is installed and in PATH
- Check that no other application is using port 5000

## Development

To modify the application:
- Frontend: `frontend/` folder (React/Vite)
- Backend: `backend/` folder (Node.js/Express)
- Database schema: `backend/database.sql`

Run `npm install` in each folder before development.