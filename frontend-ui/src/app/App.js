import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import Register from "../pages/register";
import About from "../pages/about";
import Dashboard from "../pages/dashboard";
import AddProjects from "../pages/dashboard/engineer/AddProjects";
import ManageProjects from "../pages/dashboard/engineer/ManageProjects";
import { HomeRedirect, ProtectedRoute, PublicOnlyRoute } from "./SessionRoutes";
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/add-projects" element={<ProtectedRoute><AddProjects /></ProtectedRoute>} />
        <Route path="/manage-projects" element={<ProtectedRoute><ManageProjects /></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;