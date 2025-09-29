import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaEnvelope, FaLock } from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const API_URL = import.meta.env.VITE_API_URL;
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        toast.success("Login successful!", { position: "top-center", autoClose: 2000 });
        navigate("/home", { replace: true });
      } else {
        toast.error(data.message || "Login failed", { position: "top-center", autoClose: 2500 });
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error", { position: "top-center", autoClose: 2500 });
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-900 via-blue-900 to-black p-4 overflow-hidden">

      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-black/70 p-10 rounded-3xl shadow-2xl max-w-md w-full space-y-6 backdrop-blur-sm sm:p-8 sm:rounded-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold animate-bounce">
            X/O
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-4">Login</h1>

        <div className="relative">
          <FaEnvelope className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 pl-10 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm"
            required
          />
        </div>

        <div className="relative">
          <FaLock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 pl-10 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:text-sm"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transform transition-all hover:scale-105"
        >
          Login
        </button>

        <p className="text-center text-gray-300 text-sm sm:text-xs">
          Don't have an account?{" "}
          <Link to="/register" className="text-purple-400 underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
