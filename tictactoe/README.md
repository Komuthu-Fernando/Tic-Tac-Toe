Tic-Tac-Toe Multiplayer Game
A real-time multiplayer Tic-Tac-Toe game built with Nx Monorepo, React (TypeScript), Node.js, Prisma, and Socket.IO.
It uses MySQL (running in Docker) as the database.

🚀 Tech Stack

Nx Monorepo – unified frontend and backend management
React (TypeScript) – responsive client UI
Node.js + Express (TypeScript) – backend services
Prisma ORM – database access with type safety
MySQL (Docker) – database container
Socket.IO – real-time gameplay
JWT Authentication – secure login with hashed passwords


📦 Project Setup
1. Clone the Repository
git clone https://github.com/Komuthu-Fernando/Tic-Tac-Toe.git
cd tictactoe
2. Install Dependencies
npm install
3. Database Setup (MySQL with Docker)
Make sure you have Docker installed.
Run a MySQL container:
docker run --name tictactoe-db \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=tictactoe \
  -p 3306:3306 \
  -d mysql:8
Update your .env file (both client & server):
textDATABASE_URL="mysql://root:yourpassword@localhost:3306/tictactoe"
JWT_SECRET="yoursecret"
VITE_API_URL=http://localhost:5000
Run Prisma migrations:
npx prisma migrate dev
4. Running the Apps
Start the Server
bashnpx nx serve server
Server runs on http://localhost:5000.
Start the Client
bashnpx nx serve client
Client runs on http://localhost:4200.

🎮 Features

Real-time multiplayer Tic-Tac-Toe
Secure authentication (JWT + hashed passwords)
Protected routes on frontend
Leaderboard and player stats
Handles disconnects and reconnections
Modern responsive UI

🔮 Future Improvements

Role-based authorization
Ranking system with ELO/MMR
Support for multiple game types