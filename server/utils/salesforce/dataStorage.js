// Data storage utilities for Salesforce routes

const fs = require('fs');
const path = require('path');

/**
 * Get the path to the projects data file
 * @returns {string} Path to projects.json
 */
const getProjectsPath = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'projects.json');
};

/**
 * Load projects from local storage
 * @returns {Array} Array of projects
 */
const loadProjects = () => {
  try {
    const projectsPath = getProjectsPath();
    if (fs.existsSync(projectsPath)) {
      const fileContent = fs.readFileSync(projectsPath, 'utf8');
      const projects = JSON.parse(fileContent);
      return projects;
    }
  } catch (error) {
    console.error('Error loading projects from file:', error);
  }
  return [];
};

/**
 * Save projects to local storage
 * @param {Array} projectsArray - Array of projects to save
 */
const saveProjects = (projectsArray) => {
  try {
    const projectsPath = getProjectsPath();
    const jsonData = JSON.stringify(projectsArray, null, 2);
    const tempPath = projectsPath + '.tmp';
    fs.writeFileSync(tempPath, jsonData, 'utf8');
    fs.renameSync(tempPath, projectsPath);
    console.log(`Saved ${projectsArray.length} projects to persistent storage`);
  } catch (error) {
    console.error('Error saving projects to file:', error);
    throw error;
  }
};

/**
 * Get the path to the project objectives data file
 * @returns {string} Path to projectObjectives.json
 */
const getProjectObjectivesPath = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'projectObjectives.json');
};

/**
 * Load project objectives from local storage
 * @returns {Array} Array of project objectives
 */
const loadProjectObjectives = () => {
  try {
    const objectivesPath = getProjectObjectivesPath();
    if (fs.existsSync(objectivesPath)) {
      const fileContent = fs.readFileSync(objectivesPath, 'utf8');
      const objectives = JSON.parse(fileContent);
      return Array.isArray(objectives) ? objectives : [];
    }
  } catch (error) {
    console.error('Error loading project objectives from file:', error);
  }
  return [];
};

/**
 * Save project objectives to local storage
 * @param {Array} objectivesArray - Array of project objectives to save
 */
const saveProjectObjectives = (objectivesArray) => {
  try {
    const objectivesPath = getProjectObjectivesPath();
    const cleanedObjectives = objectivesArray.map(obj => {
      const cleaned = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (typeof value === 'function') {
          return;
        }
        if (value !== undefined) {
          if (typeof value === 'object' && value !== null) {
            try {
              JSON.stringify(value);
              cleaned[key] = value;
            } catch (e) {
              console.warn(`Skipping circular reference in field: ${key}`);
            }
          } else {
            cleaned[key] = value;
          }
        }
      });
      return cleaned;
    });
    
    const jsonData = JSON.stringify(cleanedObjectives, null, 2);
    JSON.parse(jsonData);
    
    const tempPath = objectivesPath + '.tmp';
    fs.writeFileSync(tempPath, jsonData, 'utf8');
    fs.renameSync(tempPath, objectivesPath);
    console.log(`Saved ${objectivesArray.length} project objectives to persistent storage`);
  } catch (error) {
    console.error('Error saving project objectives to file:', error);
    throw error;
  }
};

/**
 * Get the path to the settings file
 * @returns {string} Path to salesforce-settings.json
 */
const getSettingsPath = () => {
  const settingsDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  return path.join(settingsDir, 'salesforce-settings.json');
};

module.exports = {
  getProjectsPath,
  loadProjects,
  saveProjects,
  getProjectObjectivesPath,
  loadProjectObjectives,
  saveProjectObjectives,
  getSettingsPath
};

