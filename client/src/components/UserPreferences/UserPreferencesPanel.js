import React, { useState, useEffect } from 'react';
import { Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../config/api';
import { useGPCFilter } from '../../context/GPCFilterContext';
import SearchableMultiSelect from './SearchableMultiSelect';
import './UserPreferencesPanel.css';

const ENABLE_GPC_FILTER = process.env.REACT_APP_ENABLE_GPC_FILTER === 'true' || false;

const UserPreferencesPanel = () => {
  const { refreshPreferences } = useGPCFilter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interestedAccounts, setInterestedAccounts] = useState([]);
  const [interestedProjects, setInterestedProjects] = useState([]);

  // Load preferences on mount
  useEffect(() => {
    if (ENABLE_GPC_FILTER) {
      loadPreferences();
    }
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/user/preferences');
      const accounts = response.data.interestedAccounts || [];
      const projects = response.data.interestedProjects || [];
      
      // Backend should return objects with { id, name }, but handle legacy data (IDs only)
      const normalizedAccounts = accounts.map(item => {
        if (typeof item === 'object' && item !== null && item.id && item.name) {
          return item; // Already in correct format
        }
        // Legacy: if it's just an ID string, we'll need to fetch the name
        // For now, return as-is and let the component handle it
        return typeof item === 'string' ? { id: item, name: item } : item;
      });
      
      const normalizedProjects = projects.map(item => {
        if (typeof item === 'object' && item !== null && item.id && item.name) {
          return item; // Already in correct format
        }
        // Legacy: if it's just an ID string, we'll need to fetch the name
        return typeof item === 'string' ? { id: item, name: item } : item;
      });
      
      // If we have legacy IDs, fetch names for them
      const accountsToFetch = normalizedAccounts.filter(acc => acc.name === acc.id);
      const projectsToFetch = normalizedProjects.filter(proj => proj.name === proj.id);
      
      if (accountsToFetch.length > 0) {
        const accountPromises = accountsToFetch.map(async (acc) => {
          try {
            const searchResponse = await apiClient.get(`/user/preferences/accounts/search?q=${encodeURIComponent(acc.id)}`);
            const found = searchResponse.data.find(a => a.id === acc.id);
            return found || acc;
          } catch {
            return acc;
          }
        });
        const fetchedAccounts = await Promise.all(accountPromises);
        // Replace legacy accounts with fetched ones
        normalizedAccounts.forEach((acc, idx) => {
          if (acc.name === acc.id) {
            const fetched = fetchedAccounts.find(fa => fa.id === acc.id);
            if (fetched) normalizedAccounts[idx] = fetched;
          }
        });
      }
      
      if (projectsToFetch.length > 0) {
        const projectPromises = projectsToFetch.map(async (proj) => {
          try {
            const searchResponse = await apiClient.get(`/user/preferences/projects/search?q=${encodeURIComponent(proj.id)}`);
            const found = searchResponse.data.find(p => p.id === proj.id);
            return found || proj;
          } catch {
            return proj;
          }
        });
        const fetchedProjects = await Promise.all(projectPromises);
        // Replace legacy projects with fetched ones
        normalizedProjects.forEach((proj, idx) => {
          if (proj.name === proj.id) {
            const fetched = fetchedProjects.find(fp => fp.id === proj.id);
            if (fetched) normalizedProjects[idx] = fetched;
          }
        });
      }
      
      setInterestedAccounts(normalizedAccounts);
      setInterestedProjects(normalizedProjects);
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Don't show error toast - user might not have preferences yet
    } finally {
      setLoading(false);
    }
  };

  const searchAccounts = async (searchTerm) => {
    try {
      const response = await apiClient.get(`/user/preferences/accounts/search?q=${encodeURIComponent(searchTerm)}`);
      return response.data || [];
    } catch (error) {
      console.error('Error searching accounts:', error);
      toast.error('Failed to search accounts');
      return [];
    }
  };

  const searchProjects = async (searchTerm) => {
    try {
      const response = await apiClient.get(`/user/preferences/projects/search?q=${encodeURIComponent(searchTerm)}`);
      return response.data || [];
    } catch (error) {
      console.error('Error searching projects:', error);
      toast.error('Failed to search projects');
      return [];
    }
  };

  const handleSave = async () => {
    if (!ENABLE_GPC_FILTER) {
      toast.error('GPC-Filter feature is disabled');
      return;
    }

    setSaving(true);
    try {
      // Send full objects with id and name to backend
      const accountsToSave = interestedAccounts.map(item => {
        if (typeof item === 'object' && item !== null && item.id && item.name) {
          return { id: item.id, name: item.name };
        }
        // Fallback: if it's a string, treat as ID and use it as name too
        return typeof item === 'string' ? { id: item, name: item } : item;
      });
      
      const projectsToSave = interestedProjects.map(item => {
        if (typeof item === 'object' && item !== null && item.id && item.name) {
          return { id: item.id, name: item.name };
        }
        // Fallback: if it's a string, treat as ID and use it as name too
        return typeof item === 'string' ? { id: item, name: item } : item;
      });
      
      await apiClient.post('/user/preferences', {
        interestedAccounts: accountsToSave,
        interestedProjects: projectsToSave
      });
      toast.success('Preferences saved successfully');
      // Refresh the global context
      refreshPreferences();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(error.response?.data?.error || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!ENABLE_GPC_FILTER) {
    return (
      <div className="user-preferences-panel">
        <div className="preferences-disabled-message">
          GPC-Filter feature is currently disabled.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="user-preferences-panel">
        <div className="preferences-loading">
          <Loader size={20} className="spinning" />
          <span>Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="user-preferences-panel">
      <div className="preferences-header">
        <h3>My Interested Items</h3>
        <p className="preferences-description">
          Select the Accounts and Projects you're interested in. By default, dashboards and reports will show only data related to these items.
        </p>
      </div>

      <div className="preferences-content">
        <SearchableMultiSelect
          label="Interested Accounts"
          placeholder="Search and select accounts..."
          selectedItems={interestedAccounts}
          onSelectionChange={setInterestedAccounts}
          onSearch={searchAccounts}
          itemLabelKey="name"
          itemValueKey="id"
        />

        <SearchableMultiSelect
          label="Interested Projects"
          placeholder="Search and select projects..."
          selectedItems={interestedProjects}
          onSelectionChange={setInterestedProjects}
          onSearch={searchProjects}
          itemLabelKey="name"
          itemValueKey="id"
        />
      </div>

      <div className="preferences-actions">
        <button
          className="btn-save-preferences"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader size={16} className="spinning" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UserPreferencesPanel;

