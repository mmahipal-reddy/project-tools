// DemographicSegmentationTab component for CrowdDashboard
// Extracted from CrowdDashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Filter, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import apiClient from '../../../config/api';
import toast from 'react-hot-toast';
import { loadBaselineData, saveBaselineData } from '../utils';

const DemographicSegmentationTab = ({
  formatNumber,
  formatDate,
  handleChartClick,
  metrics,
  onRefreshAll,
  autoSaveBaseline
}) => {
  // State for demographic data
  const [byAge, setByAge] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byAge || [];
  });
  const [byGender, setByGender] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byGender || [];
  });
  const [byEducation, setByEducation] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.byEducation || [];
  });
  const [ageByCountry, setAgeByCountry] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.ageByCountry || [];
  });
  const [genderByCountry, setGenderByCountry] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.genderByCountry || [];
  });
  const [educationByCountry, setEducationByCountry] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.educationByCountry || [];
  });
  const [ageVsGender, setAgeVsGender] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.ageVsGender || [];
  });
  const [educationVsAge, setEducationVsAge] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.educationVsAge || [];
  });
  const [demographicsSummary, setDemographicsSummary] = useState(() => {
    const baseline = loadBaselineData();
    return baseline?.demographicsSummary || null;
  });

  // Widget states for demographic widgets
  const [widgetStates, setWidgetStates] = useState({
    byAge: { loading: false, error: null },
    byGender: { loading: false, error: null },
    byEducation: { loading: false, error: null },
    ageByCountry: { loading: false, error: null },
    genderByCountry: { loading: false, error: null },
    educationByCountry: { loading: false, error: null },
    ageVsGender: { loading: false, error: null },
    educationVsAge: { loading: false, error: null },
    demographicsSummary: { loading: false, error: null }
  });

  // Filter state for demographic widgets
  const [filterText, setFilterText] = useState({});
  const [showFilters, setShowFilters] = useState({});

  // Fetch demographic data - full dataset (no sample size limits)
  const fetchDemographicData = useCallback(async (silent = false) => {
    setWidgetStates(prev => ({
      byAge: { loading: true, error: null },
      byGender: { loading: true, error: null },
      byEducation: { loading: true, error: null }
    }));

    try {
      // Fetch ALL data (no sample size limits - backend processes all active contributors)
      const timeout = 600000; // 10 minutes for full data processing
      
      const [ageData, genderData, educationData] = await Promise.all([
        apiClient.get('/crowd-dashboard/by-age', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: { byAge: [] } })),
        apiClient.get('/crowd-dashboard/by-gender', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: { byGender: [] } })),
        apiClient.get('/crowd-dashboard/by-education', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: { byEducation: [] } }))
      ]);
      
      // Extract data from response objects - API returns { byAge: [...] }, { byGender: [...] }, etc.
      // Also transform age data to use 'ageRange' instead of 'age' to match chart expectations
      const ageDataArray = Array.isArray(ageData.data?.byAge) 
        ? ageData.data.byAge.map(item => ({ ageRange: item.age || item.ageRange, count: item.count }))
        : (Array.isArray(ageData.data) ? ageData.data.map(item => ({ ageRange: item.age || item.ageRange, count: item.count })) : []);
      const genderDataArray = Array.isArray(genderData.data?.byGender) 
        ? genderData.data.byGender 
        : (Array.isArray(genderData.data) ? genderData.data : []);
      const educationDataArray = Array.isArray(educationData.data?.byEducation) 
        ? educationData.data.byEducation 
        : (Array.isArray(educationData.data) ? educationData.data : []);
      
      setByAge(ageDataArray);
      setByGender(genderDataArray);
      setByEducation(educationDataArray);

      // Save to baseline (merge with existing)
      const existingBaseline = loadBaselineData() || {};
      const updatedBaseline = {
        ...existingBaseline,
        byAge: ageDataArray,
        byGender: genderDataArray,
        byEducation: educationDataArray,
        savedAt: new Date().toISOString()
      };
      saveBaselineData(updatedBaseline);

      setWidgetStates({
        byAge: { loading: false, error: null },
        byGender: { loading: false, error: null },
        byEducation: { loading: false, error: null }
      });

      if (!silent) {
        toast.success('Demographic data refreshed with full dataset');
      }
    } catch (error) {
      setWidgetStates({
        byAge: { loading: false, error: error.message },
        byGender: { loading: false, error: error.message },
        byEducation: { loading: false, error: error.message }
      });
      if (!silent) {
        toast.error('Error loading demographic data');
      }
    }
  }, []);

  // Fetch additional demographic widgets
  const fetchAdditionalDemographics = useCallback(async (silent = false) => {
    try {
      // Fetch ALL data (no sample size limits - backend processes all active contributors)
      const timeout = 600000; // 10 minutes for full data processing
      
      setWidgetStates(prev => ({
        ...prev,
        ageByCountry: { loading: true, error: null },
        genderByCountry: { loading: true, error: null },
        educationByCountry: { loading: true, error: null },
        ageVsGender: { loading: true, error: null },
        educationVsAge: { loading: true, error: null },
        demographicsSummary: { loading: true, error: null }
      }));

      const [ageByCountryResponse, genderByCountryResponse, educationByCountryResponse, ageVsGenderResponse, educationVsAgeResponse, summaryResponse] = await Promise.all([
        apiClient.get('/crowd-dashboard/demographics/age-by-country', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: [] })),
        apiClient.get('/crowd-dashboard/demographics/gender-by-country', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: [] })),
        apiClient.get('/crowd-dashboard/demographics/education-by-country', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: [] })),
        apiClient.get('/crowd-dashboard/demographics/age-vs-gender', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: [] })),
        apiClient.get('/crowd-dashboard/demographics/education-vs-age', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: [] })),
        apiClient.get('/crowd-dashboard/demographics/summary', { 
          timeout,
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => ({ data: null }))
      ]);
      
      // Extract data from responses - handle both array and object responses
      const ageByCountryData = Array.isArray(ageByCountryResponse.data) ? ageByCountryResponse.data : (ageByCountryResponse.data?.data || []);
      const genderByCountryData = Array.isArray(genderByCountryResponse.data) ? genderByCountryResponse.data : (genderByCountryResponse.data?.data || []);
      const educationByCountryData = Array.isArray(educationByCountryResponse.data) ? educationByCountryResponse.data : (educationByCountryResponse.data?.data || []);
      const ageVsGenderData = Array.isArray(ageVsGenderResponse.data) ? ageVsGenderResponse.data : (ageVsGenderResponse.data?.data || []);
      const educationVsAgeData = Array.isArray(educationVsAgeResponse.data) ? educationVsAgeResponse.data : (educationVsAgeResponse.data?.data || []);
      const summaryData = summaryResponse.data;
      
      setAgeByCountry(ageByCountryData || []);
      setGenderByCountry(genderByCountryData || []);
      setEducationByCountry(educationByCountryData || []);
      setAgeVsGender(ageVsGenderData || []);
      setEducationVsAge(educationVsAgeData || []);
      setDemographicsSummary(summaryData);
      
      // Save all demographic data to baseline (merge with existing)
      const existingBaseline = loadBaselineData() || {};
      const updatedBaseline = {
        ...existingBaseline,
        ageByCountry: ageByCountryData || [],
        genderByCountry: genderByCountryData || [],
        educationByCountry: educationByCountryData || [],
        ageVsGender: ageVsGenderData || [],
        educationVsAge: educationVsAgeData || [],
        demographicsSummary: summaryData,
        savedAt: new Date().toISOString()
      };
      saveBaselineData(updatedBaseline);
      
      // Also trigger auto-save to ensure overview data is preserved
      if (autoSaveBaseline) {
        autoSaveBaseline();
      }
      
      setWidgetStates(prev => ({
        ...prev,
        ageByCountry: { loading: false, error: null },
        genderByCountry: { loading: false, error: null },
        educationByCountry: { loading: false, error: null },
        ageVsGender: { loading: false, error: null },
        educationVsAge: { loading: false, error: null },
        demographicsSummary: { loading: false, error: null }
      }));
      
      if (!silent) {
        toast.success('Additional demographics loaded');
      }
    } catch (error) {
      setWidgetStates(prev => ({
        ...prev,
        ageByCountry: { loading: false, error: error.message },
        genderByCountry: { loading: false, error: error.message },
        educationByCountry: { loading: false, error: error.message },
        ageVsGender: { loading: false, error: error.message },
        educationVsAge: { loading: false, error: error.message },
        demographicsSummary: { loading: false, error: error.message }
      }));
      if (!silent) {
        toast.error('Failed to load additional demographics');
      }
    }
  }, [autoSaveBaseline]);

  // Refresh all demographic widgets
  const refreshAllDemographicWidgets = useCallback(async (silent = false) => {
    // Refresh all demographic widgets in parallel
    setWidgetStates(prev => ({
      byAge: { loading: true, error: null },
      byGender: { loading: true, error: null },
      byEducation: { loading: true, error: null },
      ageByCountry: { loading: true, error: null },
      genderByCountry: { loading: true, error: null },
      educationByCountry: { loading: true, error: null },
      ageVsGender: { loading: true, error: null },
      educationVsAge: { loading: true, error: null },
      demographicsSummary: { loading: true, error: null },
      ...prev
    }));

    try {
      // Fetch all demographic data in parallel (full dataset)
      await Promise.all([
        fetchDemographicData(silent), // Full dataset
        fetchAdditionalDemographics(silent) // Full dataset
      ]);
      
      if (!silent) {
        toast.success('All demographic widgets refreshed with full dataset');
      }
    } catch (error) {
      if (!silent) {
        toast.error('Error refreshing some demographic widgets');
      }
    }
  }, [fetchDemographicData, fetchAdditionalDemographics]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshAll) {
      onRefreshAll.current = refreshAllDemographicWidgets;
    }
  }, [onRefreshAll, refreshAllDemographicWidgets]);

  // Fetch on mount only if baseline data doesn't exist
  useEffect(() => {
    const baseline = loadBaselineData();
    const hasBaselineData = baseline && (
      (baseline.byAge && baseline.byAge.length > 0) ||
      (baseline.byGender && baseline.byGender.length > 0) ||
      (baseline.byEducation && baseline.byEducation.length > 0) ||
      (baseline.ageByCountry && baseline.ageByCountry.length > 0) ||
      (baseline.genderByCountry && baseline.genderByCountry.length > 0) ||
      (baseline.educationByCountry && baseline.educationByCountry.length > 0)
    );
    
    // Only fetch if we don't have baseline data
    if (!hasBaselineData) {
      const hasNoData = (!byAge || byAge.length === 0) && 
                        (!byGender || byGender.length === 0) && 
                        (!byEducation || byEducation.length === 0);
      if (hasNoData) {
        fetchDemographicData(true);
      }
      // Also fetch additional demographics if not in baseline
      if (!baseline?.ageByCountry || baseline.ageByCountry.length === 0) {
        fetchAdditionalDemographics(true);
      }
    }
  }, [fetchDemographicData, fetchAdditionalDemographics]); // Only run on mount

  // Widget refresh handler for demographic widgets - fetches full dataset
  const handleDemographicWidgetRefresh = useCallback((widgetKey) => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    
    const fetchWidgetData = async () => {
      try {
        let response;
        let widgetData = null;
        const timeout = 600000; // 10 minutes for full data processing
        // Fetch full dataset (no sample size - backend processes all active contributors)
        switch(widgetKey) {
          case 'byAge':
            response = await apiClient.get('/crowd-dashboard/by-age', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            // Extract byAge array and transform 'age' to 'ageRange'
            const byAgeResponse = Array.isArray(response.data?.byAge) 
              ? response.data.byAge.map(item => ({ ageRange: item.age || item.ageRange, count: item.count }))
              : (Array.isArray(response.data) ? response.data.map(item => ({ ageRange: item.age || item.ageRange, count: item.count })) : []);
            widgetData = byAgeResponse;
            setByAge(widgetData);
            break;
          case 'byGender':
            response = await apiClient.get('/crowd-dashboard/by-gender', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            // Extract byGender array
            widgetData = Array.isArray(response.data?.byGender) 
              ? response.data.byGender 
              : (Array.isArray(response.data) ? response.data : []);
            setByGender(widgetData);
            break;
          case 'byEducation':
            response = await apiClient.get('/crowd-dashboard/by-education', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            // Extract byEducation array
            widgetData = Array.isArray(response.data?.byEducation) 
              ? response.data.byEducation 
              : (Array.isArray(response.data) ? response.data : []);
            setByEducation(widgetData);
            break;
          case 'ageByCountry':
            response = await apiClient.get('/crowd-dashboard/demographics/age-by-country', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            widgetData = Array.isArray(response.data) ? response.data : [];
            setAgeByCountry(widgetData);
            break;
          case 'genderByCountry':
            response = await apiClient.get('/crowd-dashboard/demographics/gender-by-country', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            widgetData = Array.isArray(response.data) ? response.data : [];
            setGenderByCountry(widgetData);
            break;
          case 'educationByCountry':
            response = await apiClient.get('/crowd-dashboard/demographics/education-by-country', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            widgetData = Array.isArray(response.data) ? response.data : [];
            setEducationByCountry(widgetData);
            break;
          case 'ageVsGender':
            response = await apiClient.get('/crowd-dashboard/demographics/age-vs-gender', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            widgetData = Array.isArray(response.data) ? response.data : [];
            setAgeVsGender(widgetData);
            break;
          case 'educationVsAge':
            response = await apiClient.get('/crowd-dashboard/demographics/education-vs-age', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            widgetData = Array.isArray(response.data) ? response.data : [];
            setEducationVsAge(widgetData);
            break;
          case 'demographicsSummary':
            response = await apiClient.get('/crowd-dashboard/demographics/summary', { 
              timeout,
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' }
            });
            widgetData = response.data;
            setDemographicsSummary(widgetData);
            break;
          default:
            return;
        }

        // Save to baseline for all demographic widgets (merge with existing)
        const existingBaseline = loadBaselineData() || {};
        const baselineUpdate = { ...existingBaseline };
        
        // Update baseline with the data we just set
        if (['byAge', 'byGender', 'byEducation', 'ageByCountry', 'genderByCountry', 'educationByCountry', 'ageVsGender', 'educationVsAge'].includes(widgetKey)) {
          baselineUpdate[widgetKey] = widgetData;
        } else if (widgetKey === 'demographicsSummary') {
          baselineUpdate.demographicsSummary = widgetData;
        }
        
        saveBaselineData({
          ...baselineUpdate,
          savedAt: new Date().toISOString()
        });
        
        // Also trigger auto-save to ensure overview data is preserved
        if (autoSaveBaseline) {
          autoSaveBaseline();
        }

        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
        toast.success(`${widgetKey} refreshed with full dataset`);
      } catch (error) {
        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
        toast.error(`Failed to refresh ${widgetKey}`);
      }
    };

    fetchWidgetData();
  }, [autoSaveBaseline]);

  // Render widget status for demographic widgets
  const renderDemographicWidgetStatus = useCallback((widgetKey) => {
    const state = widgetStates[widgetKey];
    if (state?.loading) {
      return (
        <div className="widget-loading">
          Loading full dataset from Salesforce...
        </div>
      );
    }
    if (state?.error) {
      return (
        <div className="widget-error">
          <span>{state.error}</span>
          <button onClick={() => handleDemographicWidgetRefresh(widgetKey)} className="retry-btn">Retry</button>
        </div>
      );
    }
    return null;
  }, [widgetStates, handleDemographicWidgetRefresh]);

  // Render widget actions for demographic widgets
  const renderDemographicWidgetActions = useCallback((widgetKey, widgetName, hasData = true) => {
    const state = widgetStates[widgetKey];
    const isLoadingFull = state?.loadingFull;
    return (
      <div className="widget-actions">
        {hasData && (
          <button
            className="widget-action-btn"
            onClick={() => setShowFilters(prev => ({ ...prev, [widgetKey]: !prev[widgetKey] }))}
            title={`Filter ${widgetName}`}
          >
            <Filter size={14} />
          </button>
        )}
        <button
          className="widget-refresh-btn"
          onClick={() => handleDemographicWidgetRefresh(widgetKey)}
          disabled={state?.loading}
          title={state?.loading ? 'Refreshing...' : state?.error ? 'Retry' : 'Refresh this widget'}
        >
          <RefreshCw size={14} className={state?.loading ? 'spinning' : ''} />
        </button>
      </div>
    );
  }, [widgetStates, handleDemographicWidgetRefresh]);

  // Apply filters to demographic data
  const applyDemographicFilters = useCallback((data, widgetKey) => {
    // Ensure data is an array before processing
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    let filtered = [...data];
    const filter = filterText[widgetKey];
    
    if (filter && filter.trim()) {
      const searchTerm = filter.toLowerCase();
      if (widgetKey === 'byAge') {
        filtered = filtered.filter(item => 
          item.ageRange?.toLowerCase().includes(searchTerm)
        );
      } else if (widgetKey === 'byGender') {
        filtered = filtered.filter(item => 
          item.gender?.toLowerCase().includes(searchTerm)
        );
      } else if (widgetKey === 'byEducation') {
        filtered = filtered.filter(item => 
          item.education?.toLowerCase().includes(searchTerm)
        );
      }
    }
    
    return filtered;
  }, [filterText]);

  // Render filter UI for demographic widgets
  const renderDemographicFilterUI = useCallback((widgetKey) => {
    if (!showFilters[widgetKey]) return null;
    
    return (
      <div className="widget-filter-panel">
        <input
          type="text"
          className="filter-input"
          placeholder={`Filter ${widgetKey}...`}
          value={filterText[widgetKey] || ''}
          onChange={(e) => setFilterText(prev => ({ ...prev, [widgetKey]: e.target.value }))}
        />
        <button
          className="filter-clear-btn"
          onClick={() => {
            setFilterText(prev => ({ ...prev, [widgetKey]: '' }));
            setShowFilters(prev => ({ ...prev, [widgetKey]: false }));
          }}
        >
          Clear
        </button>
      </div>
    );
  }, [showFilters, filterText]);

  return (
    <div className="tab-content">
      <div className="charts-grid">
        {/* Contributors by Age */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Contributors by Age</h3>
              {widgetStates.byAge?.loadingFull && (
                <span style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                  (Refining with larger sample...)
                </span>
              )}
            </div>
            {renderDemographicWidgetActions('byAge', 'By Age', byAge && byAge.length > 0)}
          </div>
          {renderDemographicFilterUI('byAge')}
          <div className="chart-container scrollable-chart">
            {renderDemographicWidgetStatus('byAge') || (
              (() => {
                const filteredData = applyDemographicFilters(byAge || [], 'byAge');
                return filteredData.length > 0 ? (
                  <div className="chart-scroll-wrapper">
                    <ResponsiveContainer width="100%" height={Math.max(400, filteredData.length * 30)}>
                      <BarChart 
                        data={filteredData} 
                        layout="vertical"
                        margin={{ top: 0, right: 30, left: 20, bottom: 20 }}
                        onClick={(data) => handleChartClick(data, 'byAge')}
                        throttleDelay={100}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="ageRange" 
                          type="category" 
                          width={100}
                          tick={{ fontSize: 11 }}
                          interval={0}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="no-data">No age data available</div>
                );
              })()
            )}
          </div>
          <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)}</div>
        </div>

        {/* Contributors by Gender */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Contributors by Gender</h3>
              {widgetStates.byGender?.loadingFull && (
                <span style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                  (Refining with larger sample...)
                </span>
              )}
            </div>
            {renderDemographicWidgetActions('byGender', 'By Gender', byGender && byGender.length > 0)}
          </div>
          {renderDemographicFilterUI('byGender')}
          <div className="chart-container">
            {renderDemographicWidgetStatus('byGender') || (
              (() => {
                const filteredData = applyDemographicFilters(byGender || [], 'byGender');
                return filteredData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={filteredData}
                        dataKey="count"
                        nameKey="gender"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label
                      >
                        {filteredData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">No gender data available</div>
                );
              })()
            )}
          </div>
          <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)}</div>
        </div>

        {/* Contributors by Education */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Contributors by Education</h3>
              {widgetStates.byEducation?.loadingFull && (
                <span style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                  (Refining with larger sample...)
                </span>
              )}
            </div>
            {renderDemographicWidgetActions('byEducation', 'By Education', byEducation && byEducation.length > 0)}
          </div>
          {renderDemographicFilterUI('byEducation')}
          <div className="chart-container scrollable-chart">
            {renderDemographicWidgetStatus('byEducation') || (
              (() => {
                const filteredData = applyDemographicFilters(byEducation || [], 'byEducation');
                return filteredData.length > 0 ? (
                  <div className="chart-scroll-wrapper">
                    <ResponsiveContainer width="100%" height={Math.max(400, filteredData.length * 30)}>
                      <BarChart 
                        data={filteredData} 
                        layout="vertical"
                        margin={{ top: 0, right: 30, left: 20, bottom: 20 }}
                        onClick={(data) => handleChartClick(data, 'byEducation')}
                        throttleDelay={100}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="education" 
                          type="category" 
                          width={150}
                          tick={{ fontSize: 11 }}
                          interval={0}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="no-data">No education data available</div>
                );
              })()
            )}
          </div>
          <div className="chart-footer">As of {formatDate(metrics.lastRefreshed)}</div>
        </div>

        {/* Demographics Summary Statistics */}
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Demographics Data Coverage</h3>
            </div>
            <div className="widget-actions">
              {renderDemographicWidgetActions('demographicsSummary', 'Demographics Summary', demographicsSummary)}
            </div>
          </div>
          {widgetStates.demographicsSummary?.loading ? (
            <div className="widget-loading">Loading coverage statistics...</div>
          ) : widgetStates.demographicsSummary?.error ? (
            <div className="widget-error">Error: {widgetStates.demographicsSummary.error}</div>
          ) : demographicsSummary ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatNumber(demographicsSummary.totalContributors)}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Total Contributors</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{demographicsSummary.ageCoverage}%</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Age Coverage ({formatNumber(demographicsSummary.withAge)})</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{demographicsSummary.genderCoverage}%</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Gender Coverage ({formatNumber(demographicsSummary.withGender)})</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{demographicsSummary.educationCoverage}%</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Education Coverage ({formatNumber(demographicsSummary.withEducation)})</div>
              </div>
            </div>
          ) : (
            <div className="no-data">No coverage data available</div>
          )}
        </div>

        {/* Age Distribution by Country */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Age Distribution by Country</h3>
            </div>
            <div className="widget-actions">
              {renderDemographicWidgetActions('ageByCountry', 'Age by Country', ageByCountry && ageByCountry.length > 0)}
            </div>
          </div>
          {widgetStates.ageByCountry?.loading ? (
            <div className="widget-loading">Loading age by country data...</div>
          ) : widgetStates.ageByCountry?.error ? (
            <div className="widget-error">Error: {widgetStates.ageByCountry.error}</div>
          ) : ageByCountry.length > 0 ? (() => {
            // Backend returns { country, "0-18": 10, "19-25": 20, ... } format
            // Extract all unique age range keys (excluding 'country')
            const allAgeRanges = [...new Set(
              ageByCountry.flatMap(item => 
                Object.keys(item).filter(key => key !== 'country')
              )
            )].sort((a, b) => {
              // Sort age ranges numerically
              const aStart = parseInt(a.split('-')[0] || a.replace('+', ''));
              const bStart = parseInt(b.split('-')[0] || b.replace('+', ''));
              return aStart - bStart;
            });
            
            const chartData = ageByCountry.map(item => {
              const dataPoint = { country: item.country };
              allAgeRanges.forEach(ageRange => {
                dataPoint[ageRange] = item[ageRange] || 0;
              });
              return dataPoint;
            });
            
            return (
              <div className="chart-container scrollable-chart">
                <div className="chart-scroll-wrapper">
                  <ResponsiveContainer width="100%" height={Math.max(400, ageByCountry.length * 80)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 20 }} throttleDelay={100}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="country" type="category" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                            return (
                              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</div>
                                <div style={{ fontSize: '12px', marginBottom: '8px' }}>Total: {formatNumber(total)}</div>
                                {payload.map((entry, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
                                    <span style={{ color: entry.color, marginRight: '6px' }}>●</span>
                                    {entry.name}: {formatNumber(entry.value || 0)}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      {allAgeRanges.map((ageRange, idx) => (
                        <Bar key={ageRange} dataKey={ageRange} stackId="a" fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 7]} name={ageRange} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })() : (
            <div className="no-data">No age by country data available</div>
          )}
        </div>

        {/* Gender Distribution by Country */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Gender Distribution by Country</h3>
            </div>
            <div className="widget-actions">
              {renderDemographicWidgetActions('genderByCountry', 'Gender by Country', genderByCountry && genderByCountry.length > 0)}
            </div>
          </div>
          {widgetStates.genderByCountry?.loading ? (
            <div className="widget-loading">Loading gender by country data...</div>
          ) : widgetStates.genderByCountry?.error ? (
            <div className="widget-error">Error: {widgetStates.genderByCountry.error}</div>
          ) : genderByCountry.length > 0 ? (() => {
            // Backend returns { country, Male: 10, Female: 20, ... } format
            // Extract all unique gender keys (excluding 'country')
            const allGenders = [...new Set(
              genderByCountry.flatMap(item => 
                Object.keys(item).filter(key => key !== 'country')
              )
            )].sort();
            
            const chartData = genderByCountry.map(item => {
              const dataPoint = { country: item.country };
              allGenders.forEach(gender => {
                dataPoint[gender] = item[gender] || 0;
              });
              return dataPoint;
            });
            
            return (
              <div className="chart-container scrollable-chart">
                <div className="chart-scroll-wrapper">
                  <ResponsiveContainer width="100%" height={Math.max(400, genderByCountry.length * 60)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 20 }} throttleDelay={100}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="country" type="category" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                            return (
                              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</div>
                                <div style={{ fontSize: '12px', marginBottom: '8px' }}>Total: {formatNumber(total)}</div>
                                {payload.map((entry, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
                                    <span style={{ color: entry.color, marginRight: '6px' }}>●</span>
                                    {entry.name}: {formatNumber(entry.value || 0)}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      {allGenders.map((gender, idx) => (
                        <Bar key={gender} dataKey={gender} stackId="a" fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]} name={gender} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })() : (
            <div className="no-data">No gender by country data available</div>
          )}
        </div>

        {/* Education Distribution by Country */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Education Distribution by Country</h3>
            </div>
            <div className="widget-actions">
              {renderDemographicWidgetActions('educationByCountry', 'Education by Country', educationByCountry && educationByCountry.length > 0)}
            </div>
          </div>
          {widgetStates.educationByCountry?.loading ? (
            <div className="widget-loading">Loading education by country data...</div>
          ) : widgetStates.educationByCountry?.error ? (
            <div className="widget-error">Error: {widgetStates.educationByCountry.error}</div>
          ) : educationByCountry.length > 0 ? (() => {
            // Backend returns { country, "Bachelor's": 10, "Master's": 20, ... } format
            // Extract all unique education keys (excluding 'country')
            const allEducations = [...new Set(
              educationByCountry.flatMap(item => 
                Object.keys(item).filter(key => key !== 'country')
              )
            )].sort();
            
            const chartData = educationByCountry.map(item => {
              const dataPoint = { country: item.country };
              allEducations.forEach(education => {
                dataPoint[education] = item[education] || 0;
              });
              return dataPoint;
            });
            
            return (
              <div className="chart-container scrollable-chart">
                <div className="chart-scroll-wrapper">
                  <ResponsiveContainer width="100%" height={Math.max(400, educationByCountry.length * 60)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 20 }} throttleDelay={100}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="country" type="category" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                            return (
                              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</div>
                                <div style={{ fontSize: '12px', marginBottom: '8px' }}>Total: {formatNumber(total)}</div>
                                {payload.map((entry, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
                                    <span style={{ color: entry.color, marginRight: '6px' }}>●</span>
                                    {entry.name}: {formatNumber(entry.value || 0)}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      {allEducations.map((education, idx) => (
                        <Bar key={education} dataKey={education} stackId="a" fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 7]} name={education} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })() : (
            <div className="no-data">No education by country data available</div>
          )}
        </div>

        {/* Age vs Gender Cross-tabulation */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Age vs Gender Distribution</h3>
            </div>
            <div className="widget-actions">
              {renderDemographicWidgetActions('ageVsGender', 'Age vs Gender', ageVsGender && ageVsGender.length > 0)}
            </div>
          </div>
          {widgetStates.ageVsGender?.loading ? (
            <div className="widget-loading">Loading age vs gender data...</div>
          ) : widgetStates.ageVsGender?.error ? (
            <div className="widget-error">Error: {widgetStates.ageVsGender.error}</div>
          ) : ageVsGender.length > 0 ? (() => {
            // Backend returns { ageRange, Male: 10, Female: 20, ... } format
            // Extract all unique gender keys (excluding 'ageRange')
            const allGenders = [...new Set(
              ageVsGender.flatMap(item => 
                Object.keys(item).filter(key => key !== 'ageRange')
              )
            )].sort();
            
            const chartData = ageVsGender.map(item => {
              const dataPoint = { ageRange: item.ageRange };
              allGenders.forEach(gender => {
                dataPoint[gender] = item[gender] || 0;
              });
              return dataPoint;
            });
            
            return (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }} throttleDelay={100}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ageRange" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                          return (
                            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</div>
                              <div style={{ fontSize: '12px', marginBottom: '8px' }}>Total: {formatNumber(total)}</div>
                              {payload.map((entry, idx) => (
                                <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
                                  <span style={{ color: entry.color, marginRight: '6px' }}>●</span>
                                  {entry.name}: {formatNumber(entry.value || 0)}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    {allGenders.map((gender, idx) => (
                      <Bar key={gender} dataKey={gender} stackId="a" fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]} name={gender} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })() : (
            <div className="no-data">No age vs gender data available</div>
          )}
        </div>

        {/* Education vs Age Analysis */}
        <div className="chart-card">
          <div className="chart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#08979C" />
              <h3>Education vs Age Distribution</h3>
            </div>
            <div className="widget-actions">
              {renderDemographicWidgetActions('educationVsAge', 'Education vs Age', educationVsAge && educationVsAge.length > 0)}
            </div>
          </div>
          {widgetStates.educationVsAge?.loading ? (
            <div className="widget-loading">Loading education vs age data...</div>
          ) : widgetStates.educationVsAge?.error ? (
            <div className="widget-error">Error: {widgetStates.educationVsAge.error}</div>
          ) : educationVsAge.length > 0 ? (() => {
            // Backend returns { education, "0-18": 10, "19-25": 20, ... } format
            // Extract all unique age range keys (excluding 'education')
            const allAgeRanges = [...new Set(
              educationVsAge.flatMap(item => 
                Object.keys(item).filter(key => key !== 'education')
              )
            )].sort((a, b) => {
              // Sort age ranges numerically
              const aStart = parseInt(a.split('-')[0] || a.replace('+', ''));
              const bStart = parseInt(b.split('-')[0] || b.replace('+', ''));
              return aStart - bStart;
            });
            
            const chartData = educationVsAge.map(item => {
              const dataPoint = { education: item.education };
              allAgeRanges.forEach(ageRange => {
                dataPoint[ageRange] = item[ageRange] || 0;
              });
              return dataPoint;
            });
            
            return (
              <div className="chart-container scrollable-chart">
                <div className="chart-scroll-wrapper">
                  <ResponsiveContainer width="100%" height={Math.max(400, educationVsAge.length * 60)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 20 }} throttleDelay={100}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="education" type="category" width={200} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                            return (
                              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</div>
                                <div style={{ fontSize: '12px', marginBottom: '8px' }}>Total: {formatNumber(total)}</div>
                                {payload.map((entry, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
                                    <span style={{ color: entry.color, marginRight: '6px' }}>●</span>
                                    {entry.name}: {formatNumber(entry.value || 0)}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      {allAgeRanges.map((ageRange, idx) => (
                        <Bar key={ageRange} dataKey={ageRange} stackId="a" fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 7]} name={ageRange} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })() : (
            <div className="no-data">No education vs age data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemographicSegmentationTab;
