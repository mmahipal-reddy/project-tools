// Custom hook for CrowdDashboard data fetching

import { useCallback } from 'react';
import apiClient from '../../../config/api';
import toast from 'react-hot-toast';
import { applyGPCFilterToConfig } from '../../../utils/gpcFilter';

/**
 * Custom hook for managing CrowdDashboard data fetching
 */
export const useCrowdDashboardData = (
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
  setWidgetStates,
  gpcFilterParams
) => {
  // Fetch base metrics (fast)
  const fetchBaseMetrics = useCallback(async (silent = false, widgetKey = 'baseMetrics') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      const config = applyGPCFilterToConfig({ timeout: 60000 }, gpcFilterParams);
      const response = await apiClient.get('/crowd-dashboard/metrics', config);
      const { activeContributors, onboardingContributors, avgAppReceivedToApplied, avgAppReceivedToActive, ...baseMetrics } = response.data;
      setMetrics(prev => ({
        ...prev,
        ...baseMetrics,
        activeContributors: prev.activeContributors,
        onboardingContributors: prev.onboardingContributors,
        avgAppReceivedToApplied: prev.avgAppReceivedToApplied,
        avgAppReceivedToActive: prev.avgAppReceivedToActive,
        lastRefreshed: new Date().toISOString()
      }));
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
      if (!silent) {
        toast.success('Base metrics updated');
      }
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading base metrics');
      }
    }
  }, [setMetrics, setWidgetStates, gpcFilterParams]);

  // Fetch active contributors
  const fetchActiveContributors = useCallback(async (silent = false, widgetKey = 'activeContributors') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      const config = applyGPCFilterToConfig({ timeout: 600000 }, gpcFilterParams);
      const response = await apiClient.get('/crowd-dashboard/active-contributors', config);
      setMetrics(prev => ({
        ...prev,
        activeContributors: response.data.activeContributors || 0,
        totalActiveOnProjects: response.data.totalActiveOnProjects || 0,
        lastRefreshed: new Date().toISOString()
      }));
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
      if (!silent) {
        toast.success('Active contributors updated');
      }
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading active contributors');
      }
    }
  }, [setMetrics, setWidgetStates, gpcFilterParams]);

  // Fetch onboarding contributors
  const fetchOnboardingContributors = useCallback(async (silent = false, widgetKey = 'onboardingContributors') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      const config = applyGPCFilterToConfig({ timeout: 600000 }, gpcFilterParams);
      const response = await apiClient.get('/crowd-dashboard/onboarding-contributors', config);
      setMetrics(prev => ({
        ...prev,
        onboardingContributors: response.data.onboardingContributors || 0,
        lastRefreshed: new Date().toISOString()
      }));
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
      if (!silent) {
        toast.success('Onboarding contributors updated');
      }
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading onboarding contributors');
      }
    }
  }, [setMetrics, setWidgetStates, gpcFilterParams]);

  const fetchKYCStatus = useCallback(async (silent = false, widgetKey = 'kycStatus') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // KYC Status is demographic data, not project-specific - don't apply GPC filter
      const config = { timeout: 120000 };
      const response = await apiClient.get('/crowd-dashboard/kyc-status', config);
      setKycStatus(response.data.kycStatus || []);
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
    }
  }, [setKycStatus, setWidgetStates]);

  const fetchByCountry = useCallback(async (silent = false, widgetKey = 'byCountry') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // Country is demographic data, not project-specific - don't apply GPC filter
      const config = { timeout: 60000 };
      const response = await apiClient.get('/crowd-dashboard/by-country', config);
      setByCountry(response.data.byCountry || []);
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
    }
  }, [setByCountry, setWidgetStates]);

  const fetchByLanguage = useCallback(async (silent = false, widgetKey = 'byLanguage') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // Language is demographic data, not project-specific - don't apply GPC filter
      const config = { timeout: 60000 };
      const response = await apiClient.get('/crowd-dashboard/by-language', config);
      setByLanguage(response.data.byLanguage || []);
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
    }
  }, [setByLanguage, setWidgetStates]);

  const fetchByProject = useCallback(async (silent = false, widgetKey = 'byProject') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      const baseConfig = {
        timeout: 300000,
        params: { _t: Date.now() }, // Cache busting
        headers: { 'Cache-Control': 'no-cache' }
      };
      const config = applyGPCFilterToConfig(baseConfig, gpcFilterParams);
      const response = await apiClient.get('/crowd-dashboard/by-project', config);
      setByProject(response.data.byProject || []);
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
      if (!silent && response.data.byProject && response.data.byProject.length === 0) {
        console.log('[Crowd Dashboard] No project data available');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: errorMsg } }));
      setByProject([]);
      if (!silent) {
        toast.error(`Failed to load project data: ${errorMsg}`);
      }
      console.error('[Crowd Dashboard] Error fetching by project:', error);
    }
  }, [setByProject, setWidgetStates, gpcFilterParams]);

  const fetchByCountryLanguage = useCallback(async (silent = false, widgetKey = 'byCountryLanguage') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // Country/Language is demographic data, not project-specific - don't apply GPC filter
      const baseConfig = {
        timeout: 300000,
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      };
      const config = baseConfig;
      const response = await apiClient.get('/crowd-dashboard/by-country-language', config);
      
      const countryLangData = response.data?.byCountryLanguage || [];
      setByCountryLanguage(countryLangData);
      
      setWidgetStates(prev => ({ 
        ...prev, 
        [widgetKey]: { 
          loading: false, 
          error: response.data?.error || null 
        } 
      }));
      
      if (!silent) {
        if (response.data?.error && countryLangData.length === 0) {
          const errorMsg = response.data?.message || response.data?.error;
          toast.error(`Failed to load country-language data: ${errorMsg}`);
        } else if (countryLangData.length === 0 && !response.data?.error) {
          console.log('[Crowd Dashboard] No country-language data available');
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: errorMsg } }));
      setByCountryLanguage([]);
      if (!silent) {
        toast.error(`Failed to load country-language data: ${errorMsg}`);
      }
      console.error('[Crowd Dashboard] Error fetching by country-language:', error);
    }
  }, [setByCountryLanguage, setWidgetStates]);

  const fetchBySource = useCallback(async (silent = false, widgetKey = 'bySource') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // Source is demographic data, not project-specific - don't apply GPC filter
      const baseConfig = {
        timeout: 600000,
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      };
      const config = baseConfig;
      const response = await apiClient.get('/crowd-dashboard/by-source', config);
      
      // Handle response data - check for bySource array or error/warning
      const sourceData = response.data?.bySource || [];
      const hasError = response.data?.error;
      const hasWarning = response.data?.warning;
      
      setBySource(sourceData);
      
      // Always clear loading state
      setWidgetStates(prev => ({ 
        ...prev, 
        [widgetKey]: { 
          loading: false, 
          error: hasError ? (response.data?.message || response.data?.error) : null 
        } 
      }));
      
      if (!silent) {
        if (hasWarning) {
          toast(response.data.warning, { icon: '⚠️' });
        }
        if (hasError && sourceData.length === 0) {
          const errorMsg = response.data?.message || response.data?.error;
          toast.error(`Failed to load source data: ${errorMsg}`);
        } else if (sourceData.length === 0 && !hasWarning && !hasError) {
          // No data but no error - might be legitimate
          console.log('[Crowd Dashboard] No source data available');
        }
      }
    } catch (error) {
      // Ensure loading state is always cleared on error
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: errorMsg } }));
      setBySource([]);
      if (!silent) {
        toast.error(`Failed to load source data: ${errorMsg}`);
      }
      console.error('[Crowd Dashboard] Error fetching by source:', error);
    }
  }, [setBySource, setWidgetStates]);

  const fetchAvgAppReceivedToApplied = useCallback(async (silent = false, widgetKey = 'avgAppReceivedToApplied') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      const config = applyGPCFilterToConfig({ timeout: 120000 }, gpcFilterParams);
      const response = await apiClient.get('/crowd-dashboard/avg-app-received-to-applied', config);
      setMetrics(prev => ({
        ...prev,
        avgAppReceivedToApplied: response.data.avgAppReceivedToApplied || 0,
        lastRefreshed: new Date().toISOString()
      }));
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
      if (!silent) {
        toast.success('Avg App Received to Applied updated');
      }
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading avg app received to applied');
      }
    }
  }, [setMetrics, setWidgetStates, gpcFilterParams]);

  const fetchAvgAppReceivedToActive = useCallback(async (silent = false, widgetKey = 'avgAppReceivedToActive') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      const config = applyGPCFilterToConfig({ timeout: 120000 }, gpcFilterParams);
      const response = await apiClient.get('/crowd-dashboard/avg-app-received-to-active', config);
      setMetrics(prev => ({
        ...prev,
        avgAppReceivedToActive: response.data.avgAppReceivedToActive || 0,
        lastRefreshed: new Date().toISOString()
      }));
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
      if (!silent) {
        toast.success('Avg App Received to Active updated');
      }
    } catch (error) {
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading avg app received to active');
      }
    }
  }, [setMetrics, setWidgetStates, gpcFilterParams]);

  const fetchByContributorSource = useCallback(async (silent = false, widgetKey = 'byContributorSource') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // Contributor Source is demographic data, not project-specific - don't apply GPC filter
      const baseConfig = {
        timeout: 600000,
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      };
      const config = baseConfig;
      const response = await apiClient.get('/crowd-dashboard/by-contributor-source', config);
      if (response.data.byContributorSource && Array.isArray(response.data.byContributorSource)) {
        setByContributorSource(response.data.byContributorSource);
        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
        if (!silent) {
          toast.success('Contributors by Contributor Source updated');
        }
      } else {
        setByContributorSource([]);
        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
        if (!silent && response.data.warning) {
          toast(response.data.warning, { icon: '⚠️' });
        }
      }
    } catch (error) {
      setByContributorSource([]);
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading contributors by contributor source');
      }
    }
  }, [setByContributorSource, setWidgetStates]);

  const fetchByContributorStatus = useCallback(async (silent = false, widgetKey = 'byContributorStatus') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // Contributor Status is demographic data, not project-specific - don't apply GPC filter
      const baseConfig = {
        timeout: 600000,
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      };
      const config = baseConfig;
      const response = await apiClient.get('/crowd-dashboard/by-contributor-status', config);
      if (response.data.byContributorStatus && Array.isArray(response.data.byContributorStatus)) {
        setByContributorStatus(response.data.byContributorStatus);
        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
        if (!silent) {
          toast.success('Contributors by Contributor Status updated');
        }
      } else {
        setByContributorStatus([]);
        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
        if (!silent && response.data.warning) {
          toast(response.data.warning, { icon: '⚠️' });
        }
      }
    } catch (error) {
      setByContributorStatus([]);
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading contributors by contributor status');
      }
    }
  }, [setByContributorStatus, setWidgetStates]);

  const fetchByContributorType = useCallback(async (silent = false, widgetKey = 'byContributorType') => {
    setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: true, error: null } }));
    try {
      // Contributor Type is demographic data, not project-specific - don't apply GPC filter
      const baseConfig = {
        timeout: 600000,
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      };
      const config = baseConfig;
      const response = await apiClient.get('/crowd-dashboard/by-contributor-type', config);
      if (response.data.byContributorType && Array.isArray(response.data.byContributorType)) {
        setByContributorType(response.data.byContributorType);
        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
        if (!silent) {
          toast.success('Contributors by Contributor Type updated');
        }
      } else {
        setByContributorType([]);
        setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: null } }));
        if (!silent && response.data.warning) {
          toast(response.data.warning, { icon: '⚠️' });
        }
      }
    } catch (error) {
      setByContributorType([]);
      setWidgetStates(prev => ({ ...prev, [widgetKey]: { loading: false, error: error.message } }));
      if (!silent) {
        toast.error('Error loading contributors by contributor type');
      }
    }
  }, [setByContributorType, setWidgetStates]);

  const fetchAllData = useCallback(async (silent = false) => {
    fetchBaseMetrics(silent);
    fetchActiveContributors(silent);
    fetchOnboardingContributors(silent);
    fetchAvgAppReceivedToApplied(silent);
    fetchAvgAppReceivedToActive(silent);
    fetchKYCStatus(silent);
    fetchByCountry(silent);
    fetchByLanguage(silent);
    fetchByProject(silent);
    fetchByCountryLanguage(silent);
    fetchBySource(silent);
    fetchByContributorSource(silent);
    fetchByContributorStatus(silent);
    fetchByContributorType(silent);
  }, [
    fetchBaseMetrics,
    fetchActiveContributors,
    fetchOnboardingContributors,
    fetchAvgAppReceivedToApplied,
    fetchAvgAppReceivedToActive,
    fetchKYCStatus,
    fetchByCountry,
    fetchByLanguage,
    fetchByProject,
    fetchByCountryLanguage,
    fetchBySource,
    fetchByContributorSource,
    fetchByContributorStatus,
    fetchByContributorType
  ]);

  return {
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
  };
};

