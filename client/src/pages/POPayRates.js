import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Menu, RefreshCw, Loader, Filter } from 'lucide-react';
import UserProfileDropdown from '../components/UserProfileDropdown/UserProfileDropdown';
import apiClient from '../config/api';
import toast from 'react-hot-toast';
import BookmarkButton from '../components/BookmarkButton';
import { useGPCFilter } from '../context/GPCFilterContext';
import { applyGPCFilterToParams } from '../utils/gpcFilter';
import GPCFilterToggle from '../components/GPCFilter/GPCFilterToggle';
import POPayRatesTable from '../components/POPayRates/POPayRatesTable';
import POPayRatesFilterBuilder from '../components/POPayRates/POPayRatesFilterBuilder';
import TruncatedSpan from '../components/TruncatedSpan';
import '../styles/POPayRates.css';
import '../styles/Sidebar.css';
import '../styles/GlobalHeader.css';

const POPayRates = () => {
  const { user, logout } = useAuth();
  const { getFilterParams } = useGPCFilter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([
    'Name',
    'Status__c',
    'Project_Rate__c',
    'Client_Pay_Rate__c',
    'Minimum_Rate__c',
    'Maximum_Rate__c'
  ]);
  const [ratesFields, setRatesFields] = useState([]);
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
      const response = await apiClient.get('/po-pay-rates/fields');
      if (response.data.success) {
        const fields = response.data.fields || [];
        setAvailableFields(fields);
        setRatesFields(fields);
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
      
      if (Object.keys(filters).length > 0) {
        params.append('filters', JSON.stringify(filters));
      }
      
      // Apply GPC-Filter
      const gpcFilterParams = getFilterParams();
      applyGPCFilterToParams(params, gpcFilterParams);
      
      const response = await apiClient.get(`/po-pay-rates?${params.toString()}`);
      if (response.data.success) {
        const newRecords = response.data.records || [];
        if (reset) {
          setRecords(newRecords);
          setOffset(newRecords.length);
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
        toast.error(response.data.error || 'Failed to fetch PO Pay Rates data');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch PO Pay Rates data';
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
    setFilters({});
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
          className="po-pay-rates-loading-wrapper" 
          style={{ 
            marginLeft: `${currentSidebarWidth}px`, 
            width: `calc(100% - ${currentSidebarWidth}px)`,
            left: `${currentSidebarWidth}px`,
            zIndex: 1
          }}
        >
          <div className="po-pay-rates-loading-content">
            <Loader className="spinning" size={24} style={{ color: '#08979C' }} />
            <p style={{ color: '#666', fontSize: '14px', margin: 0, fontFamily: 'Poppins' }}>Loading PO Pay Rates data...</p>
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
      }} className="po-pay-rates-main-wrapper">
        <div className="po-pay-rates-container">
          <div className="po-pay-rates-header">
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
                    <TruncatedSpan title="PO Pay Rates">PO Pay Rates</TruncatedSpan>
                  </h1>
                  <p className="page-subtitle">View pay rates for Project Objectives</p>
                </div>
              </div>
              <div className="header-right">
                <GPCFilterToggle />
              </div>
              <div className="header-user-profile">
                <BookmarkButton pageName="PO Pay Rates" pageType="page" />
                <UserProfileDropdown />
              </div>
            </div>
          </div>

          <div className="po-pay-rates-content">
            <div className="po-pay-rates-main-content">
              {showFilters && (
                <POPayRatesFilterBuilder
                  availableFields={availableFields}
                  filters={filters}
                  onSubmit={handleFilterSubmit}
                  onClear={handleClearFilters}
                  onClose={() => setShowFilters(false)}
                />
              )}

              <POPayRatesTable 
                records={records}
                loading={loading}
                loadingMore={loadingMore}
                availableFields={availableFields}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedColumns={selectedColumns}
                onColumnChange={setSelectedColumns}
                ratesFields={ratesFields}
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

export default POPayRates;

