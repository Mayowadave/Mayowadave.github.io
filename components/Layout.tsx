import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import type { Role } from '../types';
import { ICONS } from '../constants';

interface NavItem {
  path: string;
  name: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/student-dashboard', name: 'Dashboard', icon: ICONS.dashboard, roles: ['student'] },
  { path: '/profile', name: 'My Profile', icon: ICONS.profile, roles: ['student', 'industrial-supervisor', 'academic-supervisor'] },
  { path: '/industrial-dashboard', name: 'My Students', icon: ICONS.students, roles: ['industrial-supervisor'] },
  { path: '/academic-dashboard', name: 'My Students', icon: ICONS.students, roles: ['academic-supervisor'] },
  { path: '/admin-dashboard', name: 'User Management', icon: ICONS.users, roles: ['admin'] },
];

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const availableNavItems = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 flex items-center justify-center border-b border-gray-200">
                <h1 className="text-xl font-bold text-indigo-600">SIWES Pro</h1>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {availableNavItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`
                        }
                    >
                        <span className="w-6 h-6">{item.icon}</span>
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="px-4 py-4 border-t border-gray-200">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                    <span className="w-6 h-6">{ICONS.logout}</span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};


const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
    const { user } = useAuth();
    const fullName = user ? `${user.firstName} ${user.lastName}` : '';

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
             <div className="flex items-center">
                <button onClick={onToggleSidebar} className="lg:hidden mr-4 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-800">Welcome, {user?.firstName}!</h2>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{fullName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role.replace('-', ' ')}</p>
                </div>
                <img className="h-10 w-10 rounded-full object-cover" src={user?.avatar || `https://i.pravatar.cc/150?u=${user?.id}`} alt="User avatar" />
            </div>
        </header>
    );
};

const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100">
            <div className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)}></div>
            <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out z-40`}>
                <Sidebar />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                    <div className="container mx-auto px-6 py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;