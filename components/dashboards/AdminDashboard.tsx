import React, { useState, useEffect, useCallback } from 'react';
import type { User, Role } from '../../types';
import { useAuth } from '../../App';
import { getAllUsers, saveUser, deleteUser } from '../../services/mockApi';
import { Card, Button, Modal, Input, Spinner } from '../common';
import { ICONS } from '../../constants';

const UserForm: React.FC<{
    user?: User | null;
    onSave: (user: User) => void;
    onClose: () => void;
}> = ({ user, onSave, onClose }) => {
    const [formData, setFormData] = useState<Partial<User>>({
        firstName: '',
        lastName: '',
        email: '',
        role: 'student',
        studentId: '',
    });

    useEffect(() => {
        if (user) {
            setFormData(user);
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                role: 'student',
                studentId: '',
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // @ts-ignore
        const saved = await saveUser(formData);
        onSave(saved);
    };
    
    const roles: Role[] = ['student', 'industrial-supervisor', 'academic-supervisor', 'admin'];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} required />
                <Input label="Last Name" type="text" name="lastName" value={formData.lastName || ''} onChange={handleChange} required />
            </div>
            <Input label="Email" type="email" name="email" value={formData.email || ''} onChange={handleChange} required />
            <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    {roles.map(r => <option key={r} value={r} className="capitalize">{r.replace('-', ' ')}</option>)}
                </select>
            </div>
            {formData.role === 'student' && (
                 <Input label="Student ID" type="text" name="studentId" value={formData.studentId || ''} onChange={handleChange} />
            )}
            <div className="flex justify-end space-x-2 pt-4">
                <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</Button>
                <Button type="submit">Save User</Button>
            </div>
        </form>
    );
};

const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [filter, setFilter] = useState<Role | 'all'>('all');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleSave = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
    };

    const handleDelete = async (userId: string) => {
        if(window.confirm('Are you sure you want to delete this user? This will only remove their database record, not their authentication account.')) {
            await deleteUser(userId);
            fetchUsers();
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };
    
    const openNewModal = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };
    
    const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
                    <div className="flex items-center gap-4">
                         <select value={filter} onChange={(e) => setFilter(e.target.value as Role | 'all')} className="block pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                            <option value="all">All Roles</option>
                            <option value="student">Students</option>
                            <option value="industrial-supervisor">Industrial Supervisors</option>
                            <option value="academic-supervisor">Academic Supervisors</option>
                            <option value="admin">Admins</option>
                        </select>
                        <Button onClick={openNewModal}>+ Add User</Button>
                    </div>
                </div>
                {isLoading ? <Spinner /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4 capitalize">{user.role.replace('-', ' ')}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-3">
                                            <button onClick={() => openEditModal(user)} title="Edit" className="text-yellow-600 hover:text-yellow-800">{ICONS.edit}</button>
                                            <button onClick={() => handleDelete(user.id)} title="Delete" className="text-red-600 hover:text-red-800">{ICONS.delete}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedUser ? 'Edit User' : 'Add New User'}>
                <UserForm user={selectedUser} onSave={handleSave} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default AdminDashboard;