import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import useSidebarWidth from '../../hooks/useSidebarWidth';
import BookmarkButton from '../../components/BookmarkButton';
import { Menu, LogOut, RefreshCw, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../config/api';
import { useGPCFilter } from '../../context/GPCFilterContext';
import { applyGPCFilterToConfig } from '../../utils/gpcFilter';
import GPCFilterToggle from '../../components/GPCFilter/GPCFilterToggle';
import OverviewCards from './components/OverviewCards';
import FunnelChart from './components/FunnelChart';
import FinancialChart from './components/FinancialChart';
import ObjectiveChart from './components/ObjectiveChart';
import TeamChart from './components/TeamChart';
import QueueChart from './components/QueueChart';
import '../../styles/ProjectPerformance.css';
import '../../styles/Sidebar.css';
import '../../styles/GlobalHeader.css';

const ProjectPerformance = () => {
  const { user, logout } = useAuth();
  const { getFilterParams } = useGPCFilter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = useSidebarWidth(sidebarOpen);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [accounts, setAccounts] = useState([]);
  
  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [objectivesData, setObjectivesData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [queueData, setQueueData] = useState(null);
  
  // Individual tab refreshing states
  const [refreshingTab, setRefreshingTab] = useState(null);
  
  // Error states
  const [errors, setErrors] = useState({});
  
  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await apiClient.get('/project-performance/accounts');
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, []);
  
  // Fetch overview data
  const fetchOverview = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshingTab('overview');
    }
    try {
      const params = selectedAccount !== 'all' ? { account: selectedAccount } : {};
      const gpcFilterParams = getFilterParams();
      const config = applyGPCFilterToConfig({ params, timeout: 300000 }, gpcFilterParams);
      const response = await apiClient.get('/project-performance/overview', config);
      if (response.data.success) {
        setOverviewData(response.data.data);
        setErrors(prev => ({ ...prev, overview: null }));
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
      setErrors(prev => ({ ...prev, overview: error.message || 'Failed to load overview data' }));
      toast.error('Failed to load overview data');
    } finally {
      if (showRefreshing) {
        setRefreshingTab(null);
      }
    }
  }, [selectedAccount]);
  
  // Fetch funnel data
  const fetchFunnel = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshingTab('funnel');
    }
    try {
      const params = selectedAccount !== 'all' ? { account: selectedAccount } : {};
      const gpcFilterParams = getFilterParams();
      const config = applyGPCFilterToConfig({ params, timeout: 300000 }, gpcFilterParams);
      const response = await apiClient.get('/project-performance/funnel', config);
      if (response.data.success) {
        setFunnelData(response.data.data);
        setErrors(prev => ({ ...prev, funnel: null }));
      }
    } catch (error) {
      console.error('Error fetching funnel:', error);
      setErrors(prev => ({ ...prev, funnel: error.message || 'Failed to load funnel data' }));
      toast.error('Failed to load funnel data');
    } finally {
      if (showRefreshing) {
        setRefreshingTab(null);
      }
    }
  }, [selectedAccount]);
  
  // Fetch financial data
  const fetchFinancial = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshingTab('financial');
    }
    try {
      const params = selectedAccount !== 'all' ? { account: selectedAccount } : {};
      const gpcFilterParams = getFilterParams();
      const config = applyGPCFilterToConfig({ params, timeout: 300000 }, gpcFilterParams);
      const response = await apiClient.get('/project-performance/financial', config);
      if (response.data.success) {
        setFinancialData(response.data.data);
        setErrors(prev => ({ ...prev, financial: null }));
      }
    } catch (error) {
      console.error('Error fetching financial:', error);
      setErrors(prev => ({ ...prev, financial: error.message || 'Failed to load financial data' }));
      toast.error('Failed to load financial data');
    } finally {
      if (showRefreshing) {
        setRefreshingTab(null);
      }
    }
  }, [selectedAccount]);
  
  // Fetch objectives data
  const fetchObjectives = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshingTab('objectives');
    }
    try {
      const params = selectedAccount !== 'all' ? { account: selectedAccount } : {};
      const gpcFilterParams = getFilterParams();
      const config = applyGPCFilterToConfig({ params, timeout: 300000 }, gpcFilterParams);
      const response = await apiClient.get('/project-performance/objectives', config);
      if (response.data.success) {
        setObjectivesData(response.data.data);
        setErrors(prev => ({ ...prev, objectives: null }));
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
      setErrors(prev => ({ ...prev, objectives: error.message || 'Failed to load objectives data' }));
      toast.error('Failed to load objectives data');
    } finally {
      if (showRefreshing) {
        setRefreshingTab(null);
      }
    }
  }, [selectedAccount]);
  
  // Fetch team data
  const fetchTeam = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshingTab('team');
    }
    try {
      const params = selectedAccount !== 'all' ? { account: selectedAccount } : {};
      const gpcFilterParams = getFilterParams();
      const config = applyGPCFilterToConfig({ params, timeout: 300000 }, gpcFilterParams);
      const response = await apiClient.get('/project-performance/team', config);
      if (response.data.success) {
        setTeamData(response.data.data);
        setErrors(prev => ({ ...prev, team: null }));
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      setErrors(prev => ({ ...prev, team: error.message || 'Failed to load team data' }));
      toast.error('Failed to load team data');
    } finally {
      if (showRefreshing) {
        setRefreshingTab(null);
      }
    }
  }, [selectedAccount]);
  
  // Fetch queue data
  const fetchQueue = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshingTab('queue');
    }
    try {
      const params = selectedAccount !== 'all' ? { account: selectedAccount } : {};
      const gpcFilterParams = getFilterParams();
      const config = applyGPCFilterToConfig({ params, timeout: 300000 }, gpcFilterParams);
      const response = await apiClient.get('/project-performance/queue', config);
      if (response.data.success) {
        setQueueData(response.data.data);
        setErrors(prev => ({ ...prev, queue: null }));
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      setErrors(prev => ({ ...prev, queue: error.message || 'Failed to load queue data' }));
      toast.error('Failed to load queue data');
    } finally {
      if (showRefreshing) {
        setRefreshingTab(null);
      }
    }
  }, [selectedAccount]);
  
  // Fetch all data
  const fetchAllData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      await Promise.all([
        fetchOverview(),
        fetchFunnel(),
        fetchFinancial(),
        fetchObjectives(),
        fetchTeam(),
        fetchQueue()
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchOverview, fetchFunnel, fetchFinancial, fetchObjectives, fetchTeam, fetchQueue, selectedAccount]);
  
  // Initial load
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  
  // Fetch data when account changes or on initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Handle account change
  const handleAccountChange = (e) => {
    setSelectedAccount(e.target.value);
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchAllData(true);
    toast.success('Refreshing data...');
  };
  
  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="project-performance" style={{ marginLeft: `${sidebarWidth}px`, width: `calc(100% - ${sidebarWidth}px)`, transition: 'margin-left 0.2s ease, width 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-container">
            <Loader className="spinning" size={24} />
            <p>Loading project performance data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="project-performance" style={{ marginLeft: `${sidebarWidth}px`, width: `calc(100% - ${sidebarWidth}px)`, transition: 'margin-left 0.2s ease, width 0.2s ease' }}>
        <div className="project-performance-container">
          <div className="project-performance-header">
            <div className="header-content">
              <div className="header-left">
                <button
                  className="header-menu-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1 className="page-title">Project Performance Dashboard</h1>
                  <p className="page-subtitle">Monitor project health, metrics, and performance analytics</p>
                </div>
              </div>
              <div className="header-actions">
                <div className="header-user-profile">
                  <BookmarkButton pageName="Project Performance Dashboard" pageType="page" />
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
          </div>

          {/* GPC-Filter Toggle */}
          <GPCFilterToggle />
          
          <div className="project-performance-content">
            {/* Filters and Tabs */}
            <div className="dashboard-filters-tabs">
              {/* Tabs on Left */}
              <div className="tabs-section-left">
                <div className="dashboard-tabs">
                  <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'funnel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('funnel')}
                  >
                    Funnel
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'financial' ? 'active' : ''}`}
                    onClick={() => setActiveTab('financial')}
                  >
                    Financial
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'objectives' ? 'active' : ''}`}
                    onClick={() => setActiveTab('objectives')}
                  >
                    Objectives
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
                    onClick={() => setActiveTab('team')}
                  >
                    Team
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('queue')}
                  >
                    Queue
                  </button>
                </div>
              </div>
              
              {/* Account Filter in Center */}
              <div className="filter-section-center">
                <label htmlFor="account-filter">Filter by Account:</label>
                <select
                  id="account-filter"
                  value={selectedAccount}
                  onChange={handleAccountChange}
                  className="account-filter-select"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account} value={account}>{account}</option>
                  ))}
                </select>
              </div>
              
              {/* Refresh Button on Right */}
              <div className="refresh-section-right">
                <button 
                  className="btn-action" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh all data"
                >
                  {refreshing ? <Loader size={16} className="spinning" /> : <RefreshCw size={16} />}
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <OverviewCards 
                  data={overviewData} 
                  error={errors.overview}
                  onRefresh={() => fetchOverview(true)}
                  refreshing={refreshingTab === 'overview'}
                />
              )}
              
              {activeTab === 'funnel' && (
                <FunnelChart 
                  data={funnelData} 
                  error={errors.funnel}
                  onRefresh={() => fetchFunnel(true)}
                  refreshing={refreshingTab === 'funnel'}
                />
              )}
              
              {activeTab === 'financial' && (
                <FinancialChart 
                  data={financialData} 
                  error={errors.financial}
                  onRefresh={() => fetchFinancial(true)}
                  refreshing={refreshingTab === 'financial'}
                />
              )}
              
              {activeTab === 'objectives' && (
                <ObjectiveChart 
                  data={objectivesData} 
                  error={errors.objectives}
                  onRefresh={() => fetchObjectives(true)}
                  refreshing={refreshingTab === 'objectives'}
                />
              )}
              
              {activeTab === 'team' && (
                <TeamChart 
                  data={teamData} 
                  error={errors.team}
                  onRefresh={() => fetchTeam(true)}
                  refreshing={refreshingTab === 'team'}
                />
              )}
              
              {activeTab === 'queue' && (
                <QueueChart 
                  data={queueData} 
                  error={errors.queue}
                  onRefresh={() => fetchQueue(true)}
                  refreshing={refreshingTab === 'queue'}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPerformance;

