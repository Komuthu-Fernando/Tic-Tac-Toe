import { Routes, Route } from 'react-router-dom';
import Register from '../screens/Register';
import Login from '../screens/Login';
import Home from '../screens/Home';
import GameScreen from '../screens/GameScreen';
import ProtectedRoute from '../components/ProtectedRoute';
import Leaderboard from '../screens/Leaderboard';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Login />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:roomId"
        element={
          <ProtectedRoute>
            <GameScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Login />} />
    </Routes>
  );
}
