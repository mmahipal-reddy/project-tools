// CrowdDashboard utilities

import { BASELINE_STORAGE_KEY, THRESHOLDS_STORAGE_KEY, HISTORICAL_DATA_KEY } from './constants';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

/**
 * Load baseline data from localStorage
 */
export const loadBaselineData = () => {
  try {
    const saved = localStorage.getItem(BASELINE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    // Silently fail baseline loading
  }
  return null;
};

/**
 * Save current dashboard state as baseline
 */
export const saveBaselineData = (dashboardState) => {
  try {
    const stateWithTimestamp = {
      ...dashboardState,
      savedAt: dashboardState.savedAt || new Date().toISOString()
    };
    localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(stateWithTimestamp));
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Format number with K/M suffixes
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  const number = typeof num === 'number' ? num : parseFloat(num);
  if (isNaN(number)) {
    return '0';
  }
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'k';
  }
  return number.toString();
};

/**
 * Format date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get metric color based on thresholds
 */
export const getMetricColor = (key, value, thresholds) => {
  const threshold = thresholds[key];
  if (!threshold) return 'green';
  
  if (threshold.max !== undefined && value > threshold.max) return 'red';
  if (threshold.min !== undefined && value < threshold.min) return 'red';
  return threshold.color || 'green';
};

/**
 * Export widget data to Excel
 */
export const exportToExcel = (widgetKey, data, widgetName, metrics, kycStatus, byProject, byCountryLanguage, bySource) => {
  try {
    let worksheetData = [];
    let fileName = '';

    switch(widgetKey) {
      case 'baseMetrics':
        worksheetData = [
          ['Metric', 'Value'],
          ['Target HC', metrics.targetHC],
          ['Total Applications', metrics.totalApplications],
          ['Total Qualified', metrics.totalQualified],
          ['Total Active on Projects', metrics.totalActiveOnProjects],
          ['Total Productive', metrics.totalProductive],
          ['Onboarding Contributors', metrics.onboardingContributors],
          ['Active Contributors', metrics.activeContributors],
          ['Avg App Received to Applied (days)', metrics.avgAppReceivedToApplied],
          ['Avg App Received to Active (days)', metrics.avgAppReceivedToActive],
          ['Last Refreshed', formatDate(metrics.lastRefreshed)]
        ];
        fileName = 'Crowd_Dashboard_Metrics';
        break;
      case 'kycStatus':
        worksheetData = [
          ['KYC Status', 'Count'],
          ...kycStatus.map(item => [item.status || 'Unknown', item.count || 0])
        ];
        fileName = 'KYC_Status';
        break;
      case 'byProject':
        worksheetData = [
          ['Project Name', 'Active Contributors'],
          ...byProject.map(item => [item.projectName || 'Unknown', item.count || 0])
        ];
        fileName = 'Active_Contributors_by_Project';
        break;
      case 'byCountryLanguage':
        const countryLangData = [];
        countryLangData.push(['Country', 'Language', 'Count']);
        byCountryLanguage.forEach(item => {
          Object.keys(item).forEach(key => {
            if (key !== 'country' && item[key] > 0) {
              countryLangData.push([item.country || 'Unknown', key, item[key]]);
            }
          });
        });
        worksheetData = countryLangData;
        fileName = 'Active_Contributors_by_Country_Language';
        break;
      case 'bySource':
        worksheetData = [
          ['Source Details', 'Contributors'],
          ...bySource.map(item => [item.source || 'Unknown', item.count || 0])
        ];
        fileName = 'Contributors_by_Source_Details';
        break;
      default:
        toast.error('Export not available for this widget');
        return;
    }

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, widgetName || 'Data');
    
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
    toast.success(`${widgetName || 'Data'} exported successfully`);
  } catch (error) {
    toast.error('Failed to export data');
  }
};

/**
 * Get trend data for a metric
 */
export const getTrendData = (metricKey, historicalData) => {
  if (!historicalData || historicalData.length === 0) return [];
  
  return historicalData.map(snapshot => ({
    date: new Date(snapshot.timestamp).toLocaleDateString(),
    value: snapshot.metrics?.[metricKey] || 0
  })).slice(-30); // Last 30 data points
};

/**
 * Apply filters to data
 */
export const applyFilters = (data, widgetKey, debouncedFilters) => {
  if (!data || data.length === 0) return [];
  
  let filtered = data;
  
  // Apply status filter
  if (debouncedFilters.status && widgetKey === 'kycStatus') {
    const searchTerm = debouncedFilters.status.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.status?.toLowerCase().includes(searchTerm)
      );
    }
  }
  
  // Apply project filter
  if (debouncedFilters.project && widgetKey === 'byProject') {
    const searchTerm = debouncedFilters.project.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.projectName?.toLowerCase().includes(searchTerm)
      );
    }
  }
  
  // Apply country filter
  if (debouncedFilters.country && widgetKey === 'byCountryLanguage') {
    const searchTerm = debouncedFilters.country.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.country?.toLowerCase().includes(searchTerm)
      );
    }
  }
  
  return filtered;
};

/**
 * Load thresholds from localStorage
 */
export const loadThresholds = () => {
  try {
    const saved = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    // Silently fail threshold loading
  }
  return {
    targetHC: { min: 0, max: 33, color: 'red' },
    totalApplications: { min: 67, color: 'green' },
    avgAppReceivedToApplied: { max: 15, color: 'green' },
    avgAppReceivedToActive: { max: 33, color: 'green' }
  };
};

/**
 * Save thresholds to localStorage
 */
export const saveThresholds = (thresholds) => {
  try {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
    return true;
  } catch (error) {
    return false;
  }
};

