import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Menu, LogOut, RefreshCw, Settings, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import BookmarkButton from '../components/BookmarkButton';
import '../styles/CrowdDashboard.css';
import '../styles/Sidebar.css';
import '../styles/GlobalHeader.css';
import OverviewTab from './CrowdDashboard/components/OverviewTab';
import DemographicSegmentationTab from './CrowdDashboard/components/DemographicSegmentationTab';
import ThresholdModal from './CrowdDashboard/components/ThresholdModal';
import DrillDownModal from './CrowdDashboard/components/DrillDownModal';
import { useCrowdDashboardData } from './CrowdDashboard/hooks';
import { 
  loadBaselineData, 
  saveBaselineData, 
  loadThresholds, 
  saveThresholds,
  formatNumber, 
  formatDate, 
  getMetricColor, 
  exportToExcel, 
  getTrendData, 
  applyFilters 
} from './CrowdDashboard/utils';
import { 
  renderWidgetRefresh, 
  renderWidgetActions, 
  renderWidgetStatus, 
  renderFilterUI 
} from './CrowdDashboard/components/WidgetHelpers';
import { BASELINE_STORAGE_KEY, THRESHOLDS_STORAGE_KEY, HISTORICAL_DATA_KEY } from './CrowdDashboard/constants';

const CrowdDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false); // Don't block UI - show widgets immediately
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Initialize state with baseline data if available (using lazy initializer)
  // Load baseline once and reuse for all state initializations
  const [metrics, setMetrics] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.metrics || {
      targetHC: 0,
      totalApplications: 0,
      totalQualified: 0,
      totalActiveOnProjects: 0,
      totalProductive: 0,
      onboardingContributors: 0,
      activeContributors: 0,
      avgAppReceivedToApplied: 0,
      avgAppReceivedToActive: 0,
      lastRefreshed: null
    };
  });
  const [kycStatus, setKycStatus] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.kycStatus || [];
  });
  const [byCountry, setByCountry] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byCountry || [];
  });
  const [byLanguage, setByLanguage] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byLanguage || [];
  });
  const [byProject, setByProject] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byProject || [];
  });
  const [byCountryLanguage, setByCountryLanguage] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byCountryLanguage || [];
  });
  const [bySource, setBySource] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.bySource || [];
  });
  const [byContributorSource, setByContributorSource] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byContributorSource || [];
  });
  const [byContributorStatus, setByContributorStatus] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byContributorStatus || [];
  });
  const [byContributorType, setByContributorType] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byContributorType || [];
  });
  
  
  // Track loading and error states per widget
  const [widgetStates, setWidgetStates] = useState({
    baseMetrics: { loading: false, error: null },
    activeContributors: { loading: false, error: null },
    onboardingContributors: { loading: false, error: null },
    kycStatus: { loading: false, error: null },
    bySource: { loading: false, error: null },
    byContributorSource: { loading: false, error: null },
    byContributorStatus: { loading: false, error: null },
    byContributorType: { loading: false, error: null },
    byCountry: { loading: false, error: null },
    byLanguage: { loading: false, error: null },
    byProject: { loading: false, error: null },
    byCountryLanguage: { loading: false, error: null }
  });

  const [thresholds, setThresholds] = useState(loadThresholds);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  
  // Filtering state - separate state for each widget to avoid unnecessary re-renders
  const [filters, setFilters] = useState({
    dateRange: { start: null, end: null },
    status: null,
    project: null,
    country: null,
    language: null
  });
  const [showFilters, setShowFilters] = useState({});
  
  // Debounced filter values to prevent excessive re-renders
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  
  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const [drillDownData, setDrillDownData] = useState(null);
  
  // Historical data state
  const [historicalData, setHistoricalData] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORICAL_DATA_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      // Silently fail historical data loading
    }
    return [];
  });
  const [showTrendChart, setShowTrendChart] = useState({});

  // Use extracted data fetching hook
  const {
    fetchBaseMetrics,
    fetchActiveContributors,
    fetchOnboardingContributors,
    fetchKYCStatus,
    fetchByCountry,
    fetchByLanguage,
    fetchByProject,
    fetchByCountryLanguage,
    fetchBySource,
    fetchAvgAppReceivedToApplied,
    fetchAvgAppReceivedToActive,
    fetchByContributorSource,
    fetchByContributorStatus,
    fetchByContributorType,
    fetchAllData
  } = useCrowdDashboardData(
    setMetrics,
    setKycStatus,
    setByCountry,
    setByLanguage,
    setByProject,
    setByCountryLanguage,
    setBySource,
    setByContributorSource,
    setByContributorStatus,
    setByContributorType,
    setWidgetStates
  );

  // All fetch functions are now provided by useCrowdDashboardData hook

  // Log baseline data on mount and fetch only if baseline doesn't exist
  // This must be after fetchAllData is defined
  useEffect(() => {
    const baseline = loadBaselineData();
    if (baseline) {
      // Only fetch if baseline is missing critical overview data
      const hasOverviewData = baseline.metrics && 
                             (baseline.metrics.totalApplications > 0 || 
                              baseline.kycStatus?.length > 0 || 
                              baseline.byProject?.length > 0);
      
      if (!hasOverviewData) {
        fetchAllData(true); // Silent fetch
      }
    } else {
      fetchAllData(true); // Silent fetch on first load
    }
  }, [fetchAllData]);

  // Save current dashboard state as baseline
  const saveCurrentAsBaseline = useCallback(() => {
    const dashboardState = {
      metrics,
      kycStatus,
      byCountry,
      byLanguage,
      byProject,
      byCountryLanguage,
      bySource,
      byContributorSource,
      byContributorStatus,
      byContributorType,
      // Note: Demographic data is saved separately in DemographicSegmentationTab component
      savedAt: new Date().toISOString()
    };
    if (saveBaselineData(dashboardState)) {
      toast.success('Baseline data saved successfully');
    } else {
      toast.error('Failed to save baseline data');
    }
  }, [metrics, kycStatus, byCountry, byLanguage, byProject, byCountryLanguage, bySource, byContributorSource, byContributorStatus, byContributorType]);

  // Auto-save baseline whenever data changes (debounced)
  // This will be called from both main component and demographic tab
  // We'll merge with existing baseline to preserve all data
  const autoSaveBaseline = useCallback(() => {
    const existingBaseline = loadBaselineData() || {};
    const dashboardState = {
      ...existingBaseline, // Preserve demographic data if it exists
      metrics,
      kycStatus,
      byCountry,
      byLanguage,
      byProject,
      byCountryLanguage,
      bySource,
      byContributorSource,
      byContributorStatus,
      byContributorType,
      savedAt: new Date().toISOString()
    };
    saveBaselineData(dashboardState);
  }, [metrics, kycStatus, byCountry, byLanguage, byProject, byCountryLanguage, bySource, byContributorSource, byContributorStatus, byContributorType]);

  useEffect(() => {
    // Only auto-save if we have meaningful data (not all zeros/empty)
    const hasData = metrics.totalApplications > 0 || 
                   metrics.totalQualified > 0 || 
                   kycStatus.length > 0 || 
                   byProject.length > 0;
    
    if (hasData) {
      const timer = setTimeout(() => {
        autoSaveBaseline();
      }, 2000); // Debounce: save 2 seconds after last change
      
      return () => clearTimeout(timer);
    }
  }, [metrics, kycStatus, byCountry, byLanguage, byProject, byCountryLanguage, bySource, byContributorSource, byContributorStatus, byContributorType, autoSaveBaseline]);

  // Overview tab refresh handler
  const handleOverviewRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData(false);
    setTimeout(() => setRefreshing(false), 1000);
  }, [fetchAllData]);

  // Ref to store demographics refresh function
  const demographicsRefreshRef = useRef(null);

  // Tab-specific refresh handler
  const handleRefresh = useCallback(() => {
    if (activeTab === 'overview') {
      handleOverviewRefresh();
    } else if (activeTab === 'demographic-segmentation' && demographicsRefreshRef.current) {
      setRefreshing(true);
      demographicsRefreshRef.current(false).finally(() => {
        setTimeout(() => setRefreshing(false), 1000);
      });
    }
  }, [activeTab, handleOverviewRefresh]);

  // Widget-level refresh handlers
  const handleWidgetRefresh = (widgetKey) => {
    switch(widgetKey) {
      case 'baseMetrics':
        fetchBaseMetrics(false, widgetKey);
        break;
      case 'activeContributors':
        fetchActiveContributors(false, widgetKey);
        break;
      case 'onboardingContributors':
        fetchOnboardingContributors(false, widgetKey);
        break;
      case 'avgAppReceivedToApplied':
        fetchAvgAppReceivedToApplied(false, widgetKey);
        break;
      case 'avgAppReceivedToActive':
        fetchAvgAppReceivedToActive(false, widgetKey);
        break;
      case 'kycStatus':
        fetchKYCStatus(false, widgetKey);
        break;
      case 'byCountry':
        fetchByCountry(false, widgetKey);
        break;
      case 'byLanguage':
        fetchByLanguage(false, widgetKey);
        break;
      case 'byProject':
        fetchByProject(false, widgetKey);
        break;
      case 'byCountryLanguage':
        fetchByCountryLanguage(false, widgetKey, true); // Start with top 20 for fast refresh
        break;
      case 'bySource':
        fetchBySource(false, widgetKey);
        break;
      case 'byContributorSource':
        fetchByContributorSource(false, widgetKey);
        break;
      case 'byContributorStatus':
        fetchByContributorStatus(false, widgetKey);
        break;
      case 'byContributorType':
        fetchByContributorType(false, widgetKey);
        break;
      default:
        break;
    }
  };

  // formatDate is imported from utils

  // Save historical data snapshot
  const saveHistoricalSnapshot = useCallback(() => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      metrics: { ...metrics },
      kycStatus: [...kycStatus],
      byProject: [...byProject],
      byCountryLanguage: [...byCountryLanguage]
    };
    setHistoricalData(prev => {
      // Reduce snapshot size - exclude large arrays and keep only essential data
      const lightweightSnapshot = {
        timestamp: snapshot.timestamp,
        metrics: snapshot.metrics,
        kycStatus: snapshot.kycStatus,
        byProject: snapshot.byProject
        // Exclude byCountryLanguage to save space
      };
      const updated = [...prev, lightweightSnapshot].slice(-30); // Keep last 30 snapshots (reduced from 100)
      try {
        localStorage.setItem(HISTORICAL_DATA_KEY, JSON.stringify(updated));
      } catch (error) {
        // If quota exceeded, try to clear old data and keep only last 10
        try {
          const reduced = updated.slice(-10);
          localStorage.setItem(HISTORICAL_DATA_KEY, JSON.stringify(reduced));
        } catch (retryError) {
          // Silently fail if even reduced data can't be saved
        }
      }
      return updated;
    });
  }, [metrics, kycStatus, byProject, byCountryLanguage]);

  // Auto-save historical snapshot when data changes
  useEffect(() => {
    const hasData = metrics.totalApplications > 0 || kycStatus.length > 0 || byProject.length > 0;
    if (hasData) {
      const timer = setTimeout(() => {
        saveHistoricalSnapshot();
      }, 5000); // Save snapshot 5 seconds after data update
      return () => clearTimeout(timer);
    }
  }, [metrics, kycStatus, byProject, byCountryLanguage, saveHistoricalSnapshot]);

  // exportToExcel, getTrendData, and applyFilters are imported from utils
  // Create wrapper functions that pass the required parameters
  const handleExportToExcel = useCallback((widgetKey, data, widgetName) => {
    exportToExcel(widgetKey, data, widgetName, metrics, kycStatus, byProject, byCountryLanguage, bySource);
  }, [metrics, kycStatus, byProject, byCountryLanguage, bySource]);

  const handleGetTrendData = useCallback((metricKey) => {
    return getTrendData(metricKey, historicalData);
  }, [historicalData]);

  const handleApplyFilters = useCallback((data, widgetKey) => {
    return applyFilters(data, widgetKey, debouncedFilters);
  }, [debouncedFilters]);

  // Handle chart click for drill-down
  const handleChartClick = useCallback((data, widgetKey) => {
    setDrillDownData({ data, widgetKey });
  }, []);

  // Save thresholds wrapper
  const handleSaveThresholds = useCallback((newThresholds) => {
    setThresholds(newThresholds);
    if (saveThresholds(newThresholds)) {
      toast.success('Thresholds saved successfully');
    } else {
      toast.error('Failed to save thresholds');
    }
  }, []);

  // Chart colors
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  // Wrapper functions for widget helpers
  const handleRenderWidgetRefresh = (widgetKey) => {
    return renderWidgetRefresh(widgetKey, widgetStates, handleWidgetRefresh);
  };

  const handleRenderWidgetActions = (widgetKey, widgetName, hasData = true) => {
    return renderWidgetActions(
      widgetKey,
      widgetName,
      widgetStates,
      handleWidgetRefresh,
      setShowFilters,
      showFilters,
      setShowTrendChart,
      showTrendChart,
      historicalData,
      metrics,
      kycStatus,
      byProject,
      byCountryLanguage,
      bySource
    );
  };

  const handleRenderWidgetStatus = (widgetKey) => {
    return renderWidgetStatus(widgetKey, widgetStates, handleWidgetRefresh);
  };

  const handleRenderFilterUI = useCallback((widgetKey) => {
    return renderFilterUI(widgetKey, showFilters, filters, setFilters, setShowFilters);
  }, [showFilters, filters]);

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="crowd-dashboard" style={{ marginLeft: sidebarOpen ? '320px' : '80px' }}>
        <div className="crowd-dashboard-container">
          <div className="crowd-dashboard-header">
            <div className="header-content">
              <div className="header-left">
                <button
                  className="header-menu-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1 className="page-title">Crowd Dashboard</h1>
                  <p className="page-subtitle">View contributor metrics and analytics</p>
                </div>
              </div>
              <div className="header-user-profile">
                <BookmarkButton pageName="Crowd Dashboard" pageType="page" />
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

          <div className="crowd-dashboard-content">
            {/* Tabs */}
            <div className="crowd-dashboard-tabs">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`tab-button ${activeTab === 'demographic-segmentation' ? 'active' : ''}`}
                onClick={() => setActiveTab('demographic-segmentation')}
              >
                Demographics
              </button>
            </div>

            {/* Action Buttons */}
            <div className="dashboard-actions">
              {activeTab === 'overview' && (
              <button 
                className="action-btn" 
                onClick={() => setShowThresholdModal(true)}
                title="Configure thresholds"
              >
                <Settings size={18} />
                <span>Thresholds</span>
              </button>
              )}
              <button 
                className="btn-action" 
                onClick={handleRefresh}
                disabled={refreshing}
                title={activeTab === 'overview' ? 'Refresh all Overview widgets' : 'Refresh all Demographics widgets'}
              >
                {refreshing ? <Loader size={16} className="spinning" /> : <RefreshCw size={16} />}
                <span>Refresh All</span>
              </button>
              {metrics.lastRefreshed && (
                <span className="last-refreshed-text">
                  Last refreshed: {formatDate(metrics.lastRefreshed)}
                </span>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <OverviewTab
                metrics={metrics}
                kycStatus={kycStatus}
                byCountry={byCountry}
                byLanguage={byLanguage}
                byProject={byProject}
                byCountryLanguage={byCountryLanguage}
                bySource={bySource}
                byContributorSource={byContributorSource}
                byContributorStatus={byContributorStatus}
                byContributorType={byContributorType}
                historicalData={historicalData}
                showTrendChart={showTrendChart}
                setShowTrendChart={setShowTrendChart}
                thresholds={thresholds}
                getMetricColor={(key, value) => getMetricColor(key, value, thresholds)}
                formatNumber={formatNumber}
                formatDate={formatDate}
                exportToExcel={handleExportToExcel}
                renderWidgetRefresh={handleRenderWidgetRefresh}
                renderWidgetStatus={handleRenderWidgetStatus}
                renderWidgetActions={handleRenderWidgetActions}
                renderFilterUI={handleRenderFilterUI}
                applyFilters={handleApplyFilters}
                handleChartClick={handleChartClick}
                handleWidgetRefresh={handleWidgetRefresh}
                widgetStates={widgetStates}
              />
            )}

            {activeTab === 'demographic-segmentation' && (
              <DemographicSegmentationTab
                formatNumber={formatNumber}
                formatDate={formatDate}
                handleChartClick={handleChartClick}
                metrics={metrics}
                onRefreshAll={demographicsRefreshRef}
                autoSaveBaseline={autoSaveBaseline}
              />
            )}
          </div>
        </div>
      </div>

      {/* Threshold Configuration Modal */}
      <ThresholdModal
        show={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        thresholds={thresholds}
        setThresholds={setThresholds}
      />

      {/* Drill-Down Modal */}
      <DrillDownModal
        drillDownData={drillDownData}
        onClose={() => setDrillDownData(null)}
      />
    </div>
  );
};

export default CrowdDashboard;
