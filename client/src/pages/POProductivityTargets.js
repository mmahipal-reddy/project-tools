import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Menu, LogOut, RefreshCw, Loader, Filter } from 'lucide-react';
import apiClient from '../config/api';
import toast from 'react-hot-toast';
import BookmarkButton from '../components/BookmarkButton';
import { useGPCFilter } from '../context/GPCFilterContext';
import { applyGPCFilterToParams } from '../utils/gpcFilter';
import GPCFilterToggle from '../components/GPCFilter/GPCFilterToggle';
import POProductivityTargetsTable from '../components/POProductivityTargets/POProductivityTargetsTable';
import POProductivityTargetsFilterBuilder from '../components/POProductivityTargets/POProductivityTargetsFilterBuilder';
import TruncatedSpan from '../components/TruncatedSpan';
import '../styles/POProductivityTargets.css';
import '../styles/Sidebar.css';
import '../styles/GlobalHeader.css';

const POProductivityTargets = () => {
  const { user, logout } = useAuth();
  const { getFilterParams } = useGPCFilter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([
    'Name',
    'Target_Contributors__c',
    'Weekly_Contributor_Production_Hours__c',
    'Weekly_Target_Production_Hours_Calc__c',
    'Total_Target_Productivity_Hours__c',
    'Productivity_Target_Type__c'
  ]);
  const [productivityFields, setProductivityFields] = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    fetchRecords(true);
    fetchAvailableFields();
  }, []);

  // Observe sidebar width changes
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      setSidebarWidth(sidebarOpen ? 320 : 80);
      return;
    }

    const updateSidebarWidth = () => {
      const width = sidebar.offsetWidth;
      if (width > 0) {
        setSidebarWidth(width);
      } else {
        setSidebarWidth(sidebarOpen ? 320 : 80);
      }
    };

    const timeoutId = setTimeout(updateSidebarWidth, 0);
    const resizeObserver = new ResizeObserver(() => {
      updateSidebarWidth();
    });

    resizeObserver.observe(sidebar);
    sidebar.addEventListener('transitionend', updateSidebarWidth);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      sidebar.removeEventListener('transitionend', updateSidebarWidth);
    };
  }, [sidebarOpen]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setOffset(0);
    setRecords([]);
    setHasMore(true);
    fetchRecords(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedSearchTerm]);

  const fetchAvailableFields = async () => {
    try {
      const response = await apiClient.get('/po-productivity-targets');
      if (response.data.success && response.data.availableFields) {
        const fields = response.data.availableFields || [];
        setAvailableFields(fields);
        setProductivityFields(fields);
      }
    } catch (error) {
      console.error('Error fetching available fields:', error);
    }
  };

  const fetchRecords = useCallback(async (reset = false, customOffset = null) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      const currentOffset = reset ? 0 : (customOffset !== null ? customOffset : offset);
      params.append('offset', currentOffset.toString());
      params.append('limit', '1000');
      
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      
      if (filters && Array.isArray(filters) && filters.length > 0) {
        params.append('filters', JSON.stringify(filters));
      }
      
      // Apply GPC-Filter
      const gpcFilterParams = getFilterParams();
      applyGPCFilterToParams(params, gpcFilterParams);
      
      const response = await apiClient.get(`/po-productivity-targets?${params.toString()}`);
      if (response.data.success) {
        const newRecords = response.data.records || [];
        if (reset) {
          setRecords(newRecords);
          setOffset(newRecords.length);
          if (response.data.availableFields) {
            setAvailableFields(response.data.availableFields);
            setProductivityFields(response.data.availableFields);
          }
        } else {
          setRecords(prev => {
            // Avoid duplicates by checking IDs
            const existingIds = new Set(prev.map(r => r.Id));
            const uniqueNewRecords = newRecords.filter(r => !existingIds.has(r.Id));
            return [...prev, ...uniqueNewRecords];
          });
          setOffset(prev => prev + newRecords.length);
        }
        // Update hasMore based on whether we got a full batch
        setHasMore(newRecords.length === 1000);
      } else {
        toast.error(response.data.error || 'Failed to fetch PO Productivity Targets data');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch PO Productivity Targets data';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [filters, debouncedSearchTerm, offset]);

  const handleRefresh = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setRefreshing(true);
    setOffset(0);
    setRecords([]);
    setHasMore(true);
    fetchRecords(true).finally(() => {
      setRefreshing(false);
    });
  }, [fetchRecords]);

  const handleFilterSubmit = async (newFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const handleClearFilters = async () => {
    setFilters([]);
    setShowFilters(false);
  };

  // Infinite scroll - attach to scroll wrapper
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const scrollWrapper = container.querySelector('.case-table-scroll-wrapper');
    if (!scrollWrapper) return;

    let isFetching = false;
    let scrollTimeout = null;

    const handleScroll = () => {
      // Clear any pending timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Debounce scroll events
      scrollTimeout = setTimeout(() => {
        // Don't trigger if already loading, fetching, or no more data
        if (loadingMore || isFetching || !hasMore) return;
        
        const { scrollTop, scrollHeight, clientHeight } = scrollWrapper;
        
        // Trigger when within 200px of bottom (increased threshold for better UX)
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceFromBottom < 200) {
          isFetching = true;
          // Use current records length as offset for next batch
          const currentOffset = records.length;
          fetchRecords(false, currentOffset).finally(() => {
            isFetching = false;
          });
        }
      }, 100); // 100ms debounce
    };

    scrollWrapper.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also check on mount in case content is already scrolled
    handleScroll();
    
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollWrapper.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loadingMore, records.length, fetchRecords]);

  if (loading && records.length === 0) {
    const currentSidebarWidth = sidebarOpen ? sidebarWidth : 80;
    return (
      <div className="dashboard-layout">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div 
          className="po-productivity-targets-loading-wrapper" 
          style={{ 
            marginLeft: `${currentSidebarWidth}px`, 
            width: `calc(100% - ${currentSidebarWidth}px)`,
            left: `${currentSidebarWidth}px`,
            zIndex: 1
          }}
        >
          <div className="po-productivity-targets-loading-content">
            <Loader className="spinning" size={24} style={{ color: '#08979C' }} />
            <p style={{ color: '#666', fontSize: '14px', margin: 0, fontFamily: 'Poppins' }}>Loading PO Productivity Targets data...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentSidebarWidth = sidebarOpen ? sidebarWidth : 80;
  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ 
        marginLeft: `${currentSidebarWidth}px`, 
        transition: 'margin-left 0.3s ease, width 0.3s ease', 
        width: `calc(100% - ${currentSidebarWidth}px)` 
      }} className="po-productivity-targets-main-wrapper">
        <div className="po-productivity-targets-container">
          <div className="po-productivity-targets-header">
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
                  <h1 className="page-title">
                    <TruncatedSpan style={{ display: 'block' }} title="PO Productivity Targets">PO Productivity Targets</TruncatedSpan>
                  </h1>
                  <p className="page-subtitle">View productivity targets for Project Objectives</p>
                </div>
              </div>
              <div className="header-right">
                <GPCFilterToggle />
              </div>
              <div className="header-user-profile">
                <BookmarkButton pageName="PO Productivity Targets" pageType="page" />
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

          <div className="po-productivity-targets-content">
            <div className="po-productivity-targets-main-content">
              {showFilters && (
                <POProductivityTargetsFilterBuilder
                  availableFields={availableFields.filter(f => selectedColumns.includes(f.name))}
                  records={records}
                  filters={filters}
                  onSubmit={handleFilterSubmit}
                  onClear={handleClearFilters}
                  onClose={() => setShowFilters(false)}
                />
              )}

              <POProductivityTargetsTable 
                records={records}
                loading={loading}
                loadingMore={loadingMore}
                availableFields={availableFields}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedColumns={selectedColumns}
                onColumnChange={setSelectedColumns}
                productivityFields={productivityFields}
                tableContainerRef={tableContainerRef}
                hasMore={hasMore}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
                filters={filters}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POProductivityTargets;

