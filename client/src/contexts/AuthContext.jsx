import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, name, email, ... }
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // on load, try to restore session
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data?.user || res.data);
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem("token", token);
    setUser(userData);
    navigate("/events", { replace: true });
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem("token", token);
    setUser(userData);
    navigate("/events", { replace: true });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
