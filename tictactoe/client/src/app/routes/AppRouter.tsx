import { Routes, Route } from "react-router-dom";
import Register from "../screens/Register";
import Login from "../screens/Login";
import Home from "../screens/Home";
import GameScreen from "../screens/GameScreen";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/game/:roomId" element={<GameScreen />} />
    </Routes>
  );
}
