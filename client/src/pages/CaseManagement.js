import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Menu, LogOut, RefreshCw, Filter, Loader } from 'lucide-react';
import apiClient from '../config/api';
import toast from 'react-hot-toast';
import BookmarkButton from '../components/BookmarkButton';
import CaseTable from '../components/CaseManagement/CaseTable';
import CaseFilterBuilder from '../components/CaseManagement/CaseFilterBuilder';
import CaseDetailView from '../components/CaseManagement/CaseDetailView';
import useSidebarWidth from '../hooks/useSidebarWidth';
import '../styles/CaseManagement.css';
import '../styles/Sidebar.css';
import '../styles/GlobalHeader.css';

const CaseManagement = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = useSidebarWidth(sidebarOpen);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([
    'CaseNumber',
    'Case_Reason__c',
    'Type',
    'ContactId',
    'OwnerId',
    'Status',
    'CreatedDate',
    'CaseDuration'
  ]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCases();
    fetchAvailableFields();
  }, []);

  useEffect(() => {
    console.log('CaseManagement: useEffect triggered, filters:', filters);
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchAvailableFields = async () => {
    try {
      const response = await apiClient.get('/case-management/fields');
      if (response.data.success) {
        setAvailableFields(response.data.fields || []);
      }
    } catch (error) {
      console.error('Error fetching available fields:', error);
    }
  };

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Only add default status filter if no custom filters are applied
      // This allows users to filter by any status when they add custom filters
      if (filters.length === 0) {
        params.append('status', 'Open');
      }
      
      params.append('orderBy', 'CreatedDate');
      params.append('orderDirection', 'DESC');
      
      if (selectedColumns.length > 0) {
        const fieldsToQuery = selectedColumns.filter(col => col !== 'CaseDuration');
        if (selectedColumns.includes('ContactId') && !selectedColumns.includes('Contact.Name')) {
          fieldsToQuery.push('Contact.Name');
        }
        if (selectedColumns.includes('OwnerId') && !selectedColumns.includes('Owner.Name')) {
          fieldsToQuery.push('Owner.Name');
        }
        // Add ClosedDate if CaseDuration is selected (needed for calculation)
        if (selectedColumns.includes('CaseDuration') && !fieldsToQuery.includes('ClosedDate')) {
          fieldsToQuery.push('ClosedDate');
        }
        params.append('fields', fieldsToQuery.join(','));
      }
      
      if (filters.length > 0) {
        // Validate and format filters before sending
        const validFilters = filters.filter(f => f.field && f.operator && (f.value !== '' || f.operator === 'isEmpty' || f.operator === 'isNotEmpty'));
        if (validFilters.length > 0) {
          console.log('Applying filters:', validFilters);
          params.append('filters', JSON.stringify(validFilters));
        }
      }
      
      // Apply GPC-Filter
      
      console.log('Fetching cases with params:', params.toString());
      const response = await apiClient.get(`/case-management/cases?${params.toString()}`);
      if (response.data.success) {
        setCases(response.data.cases || []);
      } else {
        toast.error(response.data.error || 'Failed to fetch cases');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch cases';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedColumns, filters]);

  const handleRefresh = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setRefreshing(true);
    fetchCases().finally(() => {
      setRefreshing(false);
    });
  }, [fetchCases]);

  const handleFilterSubmit = (newFilters) => {
    console.log('CaseManagement: handleFilterSubmit called with:', newFilters);
    setFilters(newFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters([]);
    setShowFilters(false);
  };

  const handleCaseClick = async (caseId) => {
    try {
      const response = await apiClient.get(`/case-management/cases/${caseId}`);
      if (response.data.success) {
        setSelectedCase(response.data.case);
      } else {
        toast.error(response.data.error || 'Failed to fetch case details');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch case details');
    }
  };

  const handleCaseUpdate = async (caseId, updates) => {
    try {
      const response = await apiClient.put(`/case-management/cases/${caseId}`, { updates });
      if (response.data.success) {
        toast.success('Case updated successfully');
        fetchCases();
        if (selectedCase && selectedCase.Id === caseId) {
          setSelectedCase({ ...selectedCase, ...updates });
        }
      } else {
        toast.error(response.data.error || 'Failed to update case');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update case');
    }
  };

  const handleBackToList = () => {
    setSelectedCase(null);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div 
        className="case-management" 
        style={{ 
          marginLeft: `${sidebarWidth}px`, 
          width: `calc(100% - ${sidebarWidth}px)`,
          transition: 'margin-left 0.2s ease, width 0.2s ease'
        }}
      >
        <div className="case-management-container">
          <div className="case-management-header">
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
                  <h1 className="page-title">Case Management</h1>
                  <p className="page-subtitle">Manage and track cases from Salesforce</p>
                </div>
              </div>
              <div className="header-user-profile">
                <BookmarkButton pageName="Case Management" pageType="page" />
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

          <div className="case-management-content">
            {!selectedCase ? (
              <div className="case-management-main-content">
                <div className="case-management-actions">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    className="btn-action"
                    title="Refresh cases"
                  >
                    {refreshing ? <Loader size={16} className="spinning" /> : <RefreshCw size={16} />}
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn-action ${showFilters ? 'active' : ''}`}
                    title="Filter cases"
                  >
                    <Filter size={16} />
                    <span>Filter</span>
                    {filters.length > 0 && (
                      <span className="action-badge">{filters.length}</span>
                    )}
                  </button>
                </div>

                {showFilters && (
                  <CaseFilterBuilder
                    availableFields={availableFields}
                    filters={filters}
                    onSubmit={handleFilterSubmit}
                    onClear={handleClearFilters}
                    onClose={() => setShowFilters(false)}
                  />
                )}

                <CaseTable
                  cases={cases}
                  loading={loading}
                  selectedColumns={selectedColumns}
                  availableFields={availableFields}
                  onColumnChange={setSelectedColumns}
                  onCaseClick={handleCaseClick}
                />
              </div>
            ) : (
              <CaseDetailView
                caseData={selectedCase}
                availableFields={availableFields}
                onUpdate={handleCaseUpdate}
                onBack={handleBackToList}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseManagement;
