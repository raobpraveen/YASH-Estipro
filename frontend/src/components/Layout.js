import { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronDown,
  History,
  Bell,
  UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Layout = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    master: true,
    admin: true,
  });
  const [flyoutSection, setFlyoutSection] = useState(null);
  const flyoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data || []);
      setUnreadCount((response.data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        setFlyoutSection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notifications as read");
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    setFlyoutSection(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Nav items
  const mainNavItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/estimator", icon: Calculator, label: "Estimator" },
    { path: "/projects", icon: FolderKanban, label: "Projects" },
  ];

  const masterDataItems = [
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/technologies", icon: Cpu, label: "Technologies" },
    { path: "/project-types", icon: BriefcaseIcon, label: "Project Types" },
    { path: "/base-locations", icon: MapPin, label: "Base Locations" },
    { path: "/skills", icon: Layers, label: "Skills" },
    { path: "/proficiency-rates", icon: Briefcase, label: "Proficiency Rates" },
    { path: "/sales-managers", icon: UserCircle, label: "Sales Managers" },
  ];

  const adminItems = [];
  if (user?.role === "admin") {
    adminItems.push({ path: "/users", icon: UserCog, label: "User Management" });
    adminItems.push({ path: "/audit-logs", icon: History, label: "Audit Logs" });
  }

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

  // Sections config for collapsed flyout
  const sections = [
    { key: "main", title: "Main", icon: LayoutDashboard, items: mainNavItems },
    { key: "master", title: "Master Data", icon: Layers, items: masterDataItems },
    ...(adminItems.length > 0 ? [{ key: "admin", title: "Admin", icon: UserCog, items: adminItems }] : []),
    { key: "settings", title: "", icon: null, items: settingsItems },
  ];

  const NavItem = ({ item, onClick }) => (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150 rounded-md ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/50 hover:text-white/80 hover:bg-white/5"
        }`
      }
      data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
    >
      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>
    </NavLink>
  );

  // Collapsed icon-only nav item
  const CollapsedNavItem = ({ item }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-center p-2.5 rounded-md transition-all duration-150 ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`
            }
            data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
          >
            <item.icon className="w-[18px] h-[18px]" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-[#1E293B] text-white border-white/10">
          {item.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Collapsed section header that opens flyout
  const CollapsedSectionHeader = ({ section }) => {
    if (!section.title) {
      return (
        <div className="space-y-1 px-1.5">
          {section.items.map(item => (
            <CollapsedNavItem key={item.path} item={item} />
          ))}
        </div>
      );
    }

    return (
      <div className="relative">
        <button
          onClick={() => setFlyoutSection(flyoutSection === section.key ? null : section.key)}
          className={`w-full flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-md transition-colors ${
            flyoutSection === section.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
          }`}
          data-testid={`collapsed-section-${section.key}`}
        >
          <section.icon className="w-[18px] h-[18px]" />
          <span className="text-[8px] font-medium uppercase tracking-wide mt-0.5">{section.title.split(' ')[0]}</span>
        </button>
      </div>
    );
  };

  // Flyout panel for collapsed mode
  const renderFlyout = () => {
    if (!flyoutSection || !isCollapsed) return null;
    const section = sections.find(s => s.key === flyoutSection);
    if (!section) return null;

    return (
      <div
        ref={flyoutRef}
        className="fixed left-16 top-0 h-full w-56 bg-[#111827] border-l border-white/5 shadow-xl z-50 flex flex-col"
        style={{ top: 0 }}
      >
        <div className="p-4 border-b border-white/5">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">{section.title}</p>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {section.items.map(item => (
              <li key={item.path}>
                <NavItem item={item} onClick={() => setFlyoutSection(null)} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    );
  };

  // Expanded section with collapsible toggle
  const ExpandedSection = ({ section }) => {
    if (section.items.length === 0) return null;
    const isExpanded = expandedSections[section.key] !== false;

    return (
      <div className="mb-1">
        {section.title ? (
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
            className="w-full flex items-center justify-between px-3 py-2 mt-2 text-white/40 hover:text-white/60 transition-colors"
            data-testid={`section-toggle-${section.key}`}
          >
            <div className="flex items-center gap-2">
              {section.icon && <section.icon className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{section.title}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
          </button>
        ) : null}
        {isExpanded && (
          <ul className="space-y-0.5 px-2">
            {section.items.map(item => (
              <li key={item.path}>
                <NavItem item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <aside 
        className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[#0B1120] flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* Header with logos */}
        <div className={`p-3 border-b border-white/5 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <img 
              src="/yash-logo-white.jpg" 
              alt="YASH" 
              className="h-8 w-8 object-contain rounded cursor-pointer"
              onClick={() => navigate('/dashboard')}
            />
          ) : (
            <div className="cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="flex items-center gap-3">
                <img src="/yash-logo-white.jpg" alt="YASH Technologies" className="h-9 object-contain rounded" />
                <img src="/estipro-logo-new.png" alt="EstiPro" className="h-9 object-contain" />
              </div>
              <p className="text-[9px] text-white/30 mt-1.5 tracking-wider uppercase">Project Cost Estimator</p>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="mx-auto my-2 p-1.5 rounded-md hover:bg-white/10 transition-colors"
          data-testid="toggle-sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white/50" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white/50" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-1">
          {isCollapsed ? (
            <div className="space-y-2 px-1.5">
              {sections.map(section => (
                <CollapsedSectionHeader key={section.key} section={section} />
              ))}
            </div>
          ) : (
            sections.map(section => (
              <ExpandedSection key={section.key} section={section} />
            ))
          )}
        </nav>

        {/* User info */}
        {user && (
          <div className={`p-3 border-t border-white/5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            {!isCollapsed && (
              <>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{user.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                  </div>
                </div>
                <Badge className={`${getRoleBadge(user.role).color} text-[10px] mb-2 ml-1`}>
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
                    className={`text-white/30 hover:text-white/60 hover:bg-white/5 ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full'}`}
                    data-testid="logout-button"
                  >
                    <LogOut className="w-4 h-4" />
                    {!isCollapsed && <span className="ml-2 text-xs">Sign Out</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="bg-[#1E293B] text-white border-white/10">
                    Sign Out
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Footer */}
        {!isCollapsed && (
          <div className="px-4 pb-3">
            <p className="text-[9px] text-white/15">© 2026 YASH Technologies</p>
          </div>
        )}
      </aside>

      {/* Flyout panel for collapsed sections */}
      {renderFlyout()}

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
