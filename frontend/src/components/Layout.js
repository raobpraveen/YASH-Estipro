import { useState, useEffect, useCallback } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard,
  Users,
  Cpu, 
  Briefcase as BriefcaseIcon,
  MapPin, 
  Layers, 
  Briefcase, 
  Calculator, 
  FolderKanban,
  LogOut,
  User,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
  Bell,
  UserCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

const API = process.env.REACT_APP_BACKEND_URL;

const Layout = ({ user, onLogout }) => {
  const navigate = useNavigate();
  // Load saved preference from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [isHovering, setIsHovering] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Save preference to localStorage when changed
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Fetch notifications
  useEffect(() => {
    if (user?.email) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/notifications?user_email=${user?.email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.slice(0, 20));
      setUnreadCount(response.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/api/notifications/mark-all-read?user_email=${user?.email}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  // Keyboard shortcut: Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Determine if sidebar should show expanded state (collapsed but hovering)
  const showExpanded = !isCollapsed || isHovering;

  // Main navigation items
  const mainNavItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/estimator", icon: Calculator, label: "Estimator" },
    { path: "/projects", icon: FolderKanban, label: "Projects" },
  ];

  // Master Data items
  const masterDataItems = [
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/technologies", icon: Cpu, label: "Technologies" },
    { path: "/project-types", icon: BriefcaseIcon, label: "Project Types" },
    { path: "/base-locations", icon: MapPin, label: "Base Locations" },
    { path: "/skills", icon: Layers, label: "Skills" },
    { path: "/proficiency-rates", icon: Briefcase, label: "Proficiency Rates" },
    { path: "/sales-managers", icon: UserCircle, label: "Sales Managers" },
  ];

  // Admin items
  const adminItems = [];
  if (user?.role === "admin") {
    adminItems.push({ path: "/users", icon: UserCog, label: "User Management" });
    adminItems.push({ path: "/audit-logs", icon: History, label: "Audit Logs" });
  }

  // Settings
  const settingsItems = [
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const getRoleBadge = (role) => {
    const config = {
      admin: { label: "Admin", color: "bg-red-500/20 text-red-300" },
      approver: { label: "Approver", color: "bg-amber-500/20 text-amber-300" },
      user: { label: "User", color: "bg-blue-500/20 text-blue-300" },
    };
    return config[role] || config.user;
  };

  const NavItem = ({ item }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${
                isActive
                  ? "bg-[#0EA5E9] text-white shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              } ${!showExpanded ? 'justify-center' : ''}`
            }
            data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {showExpanded && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        </TooltipTrigger>
        {!showExpanded && (
          <TooltipContent side="right" className="bg-[#1E293B] text-white border-white/10">
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  const NavSection = ({ title, items }) => (
    <>
      {showExpanded && items.length > 0 && (
        <div className="px-3 py-2 mt-4 first:mt-0">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">{title}</p>
        </div>
      )}
      {!showExpanded && items.length > 0 && (
        <div className="h-px bg-white/10 mx-2 my-3" />
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.path}>
            <NavItem item={item} />
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside 
        className={`${showExpanded ? 'w-64' : 'w-16'} bg-[#0F172A] sidebar-texture flex flex-col transition-all duration-300 ease-in-out`}
        onMouseEnter={() => isCollapsed && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header with logos */}
        <div className={`p-4 border-b border-white/10 ${!showExpanded ? 'flex justify-center' : ''}`}>
          {!showExpanded ? (
            <img 
              src="/estipro-logo-new.png" 
              alt="EstiPro" 
              className="h-8 w-8 object-contain"
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src="/yash-logo-new.png" 
                  alt="YASH Technologies" 
                  className="h-8"
                />
                <img 
                  src="/estipro-logo-new.png" 
                  alt="YASH EstiPro" 
                  className="h-8"
                />
              </div>
              <p className="text-xs text-white/60">Project Cost Estimator</p>
            </>
          )}
        </div>

        {/* Toggle button */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="mx-auto my-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                data-testid="toggle-sidebar"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-white/70" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-white/70" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1E293B] text-white border-white/10">
              {isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <NavSection title="Main" items={mainNavItems} />
          <NavSection title="Master Data" items={masterDataItems} />
          {adminItems.length > 0 && <NavSection title="Admin" items={adminItems} />}
          <NavSection title="" items={settingsItems} />
        </nav>

        {/* User info */}
        {user && (
          <div className={`p-3 border-t border-white/10 ${!showExpanded ? 'flex flex-col items-center' : ''}`}>
            {showExpanded && (
              <>
                <div className="flex items-center gap-3 mb-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-white/50 truncate">{user.email}</p>
                  </div>
                </div>
                <Badge className={`${getRoleBadge(user.role).color} text-xs mb-3 ml-2`}>
                  {getRoleBadge(user.role).label}
                </Badge>
              </>
            )}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onLogout}
                    className={`text-white/70 hover:text-white hover:bg-white/10 ${!showExpanded ? 'w-10 h-10 p-0' : 'w-full'}`}
                    data-testid="logout-button"
                  >
                    <LogOut className="w-4 h-4" />
                    {showExpanded && <span className="ml-2">Sign Out</span>}
                  </Button>
                </TooltipTrigger>
                {!showExpanded && (
                  <TooltipContent side="right" className="bg-[#1E293B] text-white border-white/10">
                    Sign Out
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Footer */}
        {showExpanded && (
          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-white/40">© 2026 YASH Technologies</p>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto">
        {/* Top Bar with Notifications */}
        <div className="sticky top-0 z-10 bg-white border-b px-8 py-3 flex justify-end items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative" data-testid="notification-bell">
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b flex justify-between items-center">
                <h4 className="font-semibold">Notifications</h4>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-blue-600">
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (notif.project_id) {
                          navigate(`/projects/${notif.project_id}/summary`);
                        }
                      }}
                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 ${!notif.is_read ? 'bg-blue-50' : ''} ${notif.project_id ? 'cursor-pointer' : ''}`}
                      data-testid={`notification-item-${notif.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notif.type === 'approved' ? 'bg-green-500' :
                          notif.type === 'rejected' ? 'bg-red-500' :
                          notif.type === 'review_request' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
