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
import ActivityTemplates from "@/pages/ActivityTemplates";
import Competencies from "@/pages/Competencies";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import useIdleTimeout from "@/hooks/useIdleTimeout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

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

  // Session timeout: 15 min idle, 2 min warning
  const handleIdleTimeout = () => {
    handleLogout();
    toast.error("Session expired due to 15 minutes of inactivity. Please sign in again.", { duration: 6000 });
  };

  const { showWarning, secondsLeft, extend } = useIdleTimeout({
    enabled: !!user,
    idleMs: 15 * 60 * 1000,
    warningMs: 2 * 60 * 1000,
    onTimeout: handleIdleTimeout,
  });

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
              <Route path="activity-templates" element={<ActivityTemplates />} />
              <Route path="competencies" element={<Competencies />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
      <AlertDialog open={showWarning} onOpenChange={() => {}}>
        <AlertDialogContent data-testid="session-timeout-warning-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#0F172A]">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
              Session about to expire
            </AlertDialogTitle>
            <AlertDialogDescription>
              You've been inactive for a while. For your security, you will be signed out automatically in{" "}
              <span className="font-semibold text-[#0F172A]" data-testid="session-timeout-countdown">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleIdleTimeout} data-testid="session-timeout-logout-btn">
              Sign out now
            </AlertDialogCancel>
            <AlertDialogAction onClick={extend} className="bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="session-timeout-extend-btn">
              Stay signed in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;