# Money Tracking

A personal finance tracker with a React frontend and an Express/MongoDB API.

## Run locally

1. Use a MongoDB deployment that supports transactions (MongoDB Atlas or a local replica set).
2. In `backend-accounting-system`, copy `.env.example` to `.env` and fill in the MongoDB URI and two distinct JWT secrets.
3. Start the API:

   ```powershell
   cd backend-accounting-system
   npm install
   npm.cmd run dev
   ```

4. In a second terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The frontend runs at `http://localhost:5174`; the API defaults to `http://localhost:5000/api`. Set `CLIENT_URL` in the backend environment to the frontend origin when it differs from the default. Set `VITE_API_URL` in the frontend environment when the API URL differs from the default.

Email features need the `SMTP_*` settings in the backend `.env`. The Postman collections and API notes are in `backend-accounting-system/postman`.

## Data integrity

Account balance changes and their ledger records use MongoDB transactions. A standalone MongoDB server does not support these operations; use Atlas or configure a local replica set.
