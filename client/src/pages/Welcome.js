import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { 
  Menu, 
  LogOut, 
  Users, 
  BarChart3, 
  DollarSign, 
  Workflow, 
  Wrench, 
  FolderOpen, 
  Settings, 
  UserCog,
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  Target,
  BookOpen,
  FileText,
  ListChecks
} from 'lucide-react';
import '../styles/Welcome.css';
import '../styles/Sidebar.css';
import '../styles/GlobalHeader.css';

const Welcome = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const features = [
    {
      id: 'crowd-dashboard',
      title: 'Crowd Dashboard',
      description: 'View comprehensive analytics and insights about your contributor community, including demographics, activity metrics, and geographic distribution.',
      icon: Users,
      path: '/crowd-dashboard',
      color: '#08979C',
      category: 'Analytics',
      permission: null
    },
    {
      id: 'case-analytics',
      title: 'Case Analytics',
      description: 'Analyze case resolution trends, performance metrics, and daily solved cases by project and contributor name.',
      icon: BarChart3,
      path: '/case-analytics',
      color: '#08979C',
      category: 'Analytics',
      permission: null
    },
    {
      id: 'contributor-payments',
      title: 'Contributor Payments',
      description: 'Track and manage contributor payments, view payment trends, and analyze payment distribution by method, status, and country.',
      icon: DollarSign,
      path: '/contributor-payments',
      color: '#08979C',
      category: 'Financial',
      permission: null
    },
    {
      id: 'workstream-management',
      title: 'Workstream Management',
      description: 'Create and manage workstreams, assign project objectives, and generate comprehensive workstream reports.',
      icon: Workflow,
      path: '/workstream-management',
      color: '#08979C',
      category: 'Management',
      permission: null
    },
    {
      id: 'client-tool-account',
      title: 'Client Tool Account',
      description: 'Manage client tool account mappings for contributor projects and ensure proper account assignments.',
      icon: Wrench,
      path: '/client-tool-account',
      color: '#08979C',
      category: 'Management',
      permission: null
    },
    {
      id: 'queue-status-management',
      title: 'Queue Status Management',
      description: 'Update and manage queue status for contributor projects, including bulk updates and status tracking.',
      icon: ListChecks,
      path: '/queue-status-management',
      color: '#08979C',
      category: 'Management',
      permission: null
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure application settings, manage Salesforce connections, and customize your workspace preferences.',
      icon: Settings,
      path: '/settings',
      color: '#08979C',
      category: 'Configuration',
      permission: 'all'
    }
  ];

  const adminFeatures = [
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions for application access and security.',
      icon: UserCog,
      path: '/user-management',
      color: '#08979C',
      category: 'Administration',
      permission: 'all'
    }
  ];

  // Filter features based on user permissions
  const filteredFeatures = features.filter(feature => {
    if (!feature.permission) return true; // No permission required
    if (!user) return false; // No user means no permissions
    return hasPermission(feature.permission);
  });

  const handleFeatureClick = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="welcome-page" style={{ marginLeft: sidebarOpen ? '320px' : '80px' }}>
        <div className="welcome-container">
          {/* Header */}
          <div className="welcome-header">
            <div className="header-content">
              <div className="header-left">
                <button 
                  className="header-menu-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="Toggle sidebar"
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1 className="page-title">Welcome</h1>
                  <p className="page-subtitle">Your comprehensive project and contributor management platform</p>
                </div>
              </div>
              <div className="header-user-profile">
                <div className="user-profile">
                  <div className="user-avatar">
                    {(user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">{user?.email || 'User'}</span>
                  <button className="logout-btn" onClick={logout} title="Logout">
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Content */}
          <div className="welcome-content">
            {/* Introduction Section */}
            <div className="welcome-intro">
              <div className="intro-icon">
                <Sparkles size={32} style={{ color: '#08979C' }} />
              </div>
              <h2 className="intro-title">Welcome to Project Management Platform</h2>
              <p className="intro-description">
                A comprehensive solution for managing projects, contributors, workstreams, and analytics. 
                Navigate through the features below to access different sections of the application.
              </p>
            </div>

            {/* Features Grid */}
            <div className="features-section">
              <h3 className="section-title">Available Features</h3>
              <div className="features-grid">
                {filteredFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      className="feature-card"
                      onClick={() => handleFeatureClick(feature.path)}
                    >
                      <div className="feature-card-header">
                        <div className="feature-icon" style={{ backgroundColor: `${feature.color}15`, color: feature.color }}>
                          <IconComponent size={24} />
                        </div>
                        <div className="feature-category">{feature.category}</div>
                      </div>
                      <div className="feature-card-body">
                        <h4 className="feature-title">{feature.title}</h4>
                        <p className="feature-description">{feature.description}</p>
                      </div>
                      <div className="feature-card-footer">
                        <span className="feature-link">
                          Open <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Features Section */}
            {user && hasPermission('all') && (
              <div className="features-section">
                <h3 className="section-title">Administration</h3>
                <div className="features-grid">
                  {adminFeatures.map((feature) => {
                    const IconComponent = feature.icon;
                    return (
                      <div
                        key={feature.id}
                        className="feature-card"
                        onClick={() => handleFeatureClick(feature.path)}
                      >
                        <div className="feature-card-header">
                          <div className="feature-icon" style={{ backgroundColor: `${feature.color}15`, color: feature.color }}>
                            <IconComponent size={24} />
                          </div>
                          <div className="feature-category">{feature.category}</div>
                        </div>
                        <div className="feature-card-body">
                          <h4 className="feature-title">{feature.title}</h4>
                          <p className="feature-description">{feature.description}</p>
                        </div>
                        <div className="feature-card-footer">
                          <span className="feature-link">
                            Open <ArrowRight size={16} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;

