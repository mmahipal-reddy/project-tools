import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/GlobalHeader.css';

const UserProfileDropdown = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get user initials from name
  const getUserInitials = () => {
    if (!user) return 'U';
    
    const name = user.name || user.email || '';
    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length >= 2) {
      // First letter of first name and first letter of last name
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    } else if (nameParts.length === 1) {
      // Only one name part, use first two letters
      return nameParts[0].substring(0, 2).toUpperCase();
    } else {
      // Fallback to email first letter
      return (user.email || 'U').charAt(0).toUpperCase();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate('/administration?tab=settings');
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="user-profile-dropdown" ref={dropdownRef}>
      <button
        className="user-avatar-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div className="user-avatar">
          {getUserInitials()}
        </div>
      </button>
      
      {isOpen && (
        <div className="user-profile-dropdown-menu">
          <button
            className="dropdown-menu-item"
            onClick={handleProfileClick}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <button
            className="dropdown-menu-item"
            onClick={handleLogoutClick}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;

