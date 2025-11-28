import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import LoginPage from "./pages/LoginPage";
import PreferencesPage from "./pages/PreferencesPage";
import EventsPage from "./pages/EventsPage";
import FeedbackPage from "./pages/FeedbackPage";
import ImportPage from "./pages/ImportPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4f46e5" // indigo
    },
    secondary: {
      main: "#ec4899" // pink
    },
    background: {
      default: "#f3f4f6"
    }
  },
  shape: {
    borderRadius: 16
  }
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="import" element={<ImportPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
