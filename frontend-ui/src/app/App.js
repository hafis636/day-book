import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import Register from "../pages/register";
import About from "../pages/about";
import Dashboard from "../pages/users";
import PlansPage from "../pages/plans";
import ManagePlansPage from "../pages/users/admin/plans/modify-plans";
import RolesPermissionsPage from "../pages/users/admin/roles-permissions";
import AddProjectForm from "../pages/users/engineers/forms/AddProjectForm";
import ManageProjects from "../pages/users/engineers/ManageProjects";
import EditProject from "../pages/users/engineers/EditProject";
import ProjectSectionPage from "../pages/users/engineers/ProjectSectionPage";
import { HomeRedirect, ProtectedRoute, PublicOnlyRoute } from "./SessionRoutes";
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute excludedRoles={['admin']}><PlansPage /></ProtectedRoute>} />
        <Route path="/modify-plans" element={<ProtectedRoute allowedRoles={['admin']}><ManagePlansPage /></ProtectedRoute>} />
        <Route path="/roles-permissions" element={<ProtectedRoute allowedRoles={['admin']}><RolesPermissionsPage /></ProtectedRoute>} />
        <Route path="/add-project" element={<ProtectedRoute allowedRoles={['engineer']}><AddProjectForm /></ProtectedRoute>} />
        <Route path="/add-projects" element={<ProtectedRoute allowedRoles={['engineer']}><AddProjectForm /></ProtectedRoute>} />
        <Route path="/manage-projects" element={<ProtectedRoute allowedRoles={['engineer']}><ManageProjects /></ProtectedRoute>} />
        <Route path="/manage-projects/:projectId" element={<ProtectedRoute allowedRoles={['engineer']}><EditProject /></ProtectedRoute>} />
        <Route path="/manage-projects/:projectId/:section" element={<ProtectedRoute allowedRoles={['engineer']}><ProjectSectionPage /></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;