
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOutIcon, MenuIcon } from '../ui/Icons';

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, rol, logout } = useAuth();

  return (
    <header className="bg-surface border-b border-border shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center">
            <button
                onClick={toggleSidebar}
                className="text-text-secondary hover:text-text-primary focus:outline-none mr-4"
            >
                <MenuIcon />
            </button>
            <h1 className="text-xl font-bold text-text-primary hidden sm:block">
                Bienvenido, {user?.nombre || 'Usuario'}
            </h1>
        </div>
      <div className="flex items-center">
        <div className="text-right mr-4">
            <p className="font-semibold text-text-primary">{user?.nombre}</p>
            <p className="text-sm text-text-secondary">{rol?.nombre}</p>
        </div>
        <img 
            className="w-10 h-10 rounded-full object-cover" 
            src={user?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id}`} 
            alt="User Avatar" 
        />
        <button onClick={logout} className="ml-4 text-text-secondary hover:text-primary transition-colors">
            <LogOutIcon />
        </button>
      </div>
    </header>
  );
};

export default Header;