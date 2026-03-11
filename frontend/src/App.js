import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Technologies from "@/pages/Technologies";
import SubTechnologies from "@/pages/SubTechnologies";
import ProjectTypes from "@/pages/ProjectTypes";
import BaseLocations from "@/pages/BaseLocations";
import SkillsManagement from "@/pages/SkillsManagement";
import ProficiencyRates from "@/pages/ProficiencyRates";
import SalesManagers from "@/pages/SalesManagers";
import ProjectEstimator from "@/pages/ProjectEstimator";
import Projects from "@/pages/Projects";
import ProjectSummary from "@/pages/ProjectSummary";
import CompareVersions from "@/pages/CompareVersions";
import Login from "@/pages/Login";
import UserManagement from "@/pages/UserManagement";
import Settings from "@/pages/Settings";
import AuditLogs from "@/pages/AuditLogs";
import UserManual from "@/pages/UserManual";
import SupportGuide from "@/pages/SupportGuide";
import Tutorials from "@/pages/Tutorials";
import PaymentMilestones from "@/pages/PaymentMilestones";
import CashflowStatement from "@/pages/CashflowStatement";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="technologies" element={<Technologies />} />
              <Route path="sub-technologies" element={<SubTechnologies />} />
              <Route path="project-types" element={<ProjectTypes />} />
              <Route path="base-locations" element={<BaseLocations />} />
              <Route path="skills" element={<SkillsManagement />} />
              <Route path="proficiency-rates" element={<ProficiencyRates />} />
              <Route path="sales-managers" element={<SalesManagers />} />
              <Route path="estimator" element={<ProjectEstimator />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId/summary" element={<ProjectSummary />} />
              <Route path="projects/:projectId/compare" element={<CompareVersions />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="settings" element={<Settings />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="user-manual" element={<UserManual />} />
              <Route path="support-guide" element={<SupportGuide />} />
              <Route path="tutorials" element={<Tutorials />} />
              <Route path="payment-milestones" element={<PaymentMilestones />} />
              <Route path="cashflow" element={<CashflowStatement />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;