
import React from 'react';
import { useAuth } from '../App';
import { Card } from './common';

const Profile: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return (
            <Card title="Profile">
                <p>User not found.</p>
            </Card>
        );
    }

    const ProfileDetail: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
        if (!value) return null;
        return (
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 px-6">
                <dt className="text-sm font-medium text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value}</dd>
            </div>
        );
    };

    return (
        <Card>
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Your personal and role-specific details.</p>
            </div>
            <div className="border-t border-gray-200">
                <dl className="divide-y divide-gray-200">
                    <ProfileDetail label="Full Name" value={`${user.firstName} ${user.lastName}`} />
                    <ProfileDetail label="Email Address" value={user.email} />
                    <ProfileDetail label="Role" value={user.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                    
                    {/* Student Specific Fields */}
                    {user.role === 'student' && (
                        <>
                            <ProfileDetail label="Student ID" value={user.studentId} />
                            <ProfileDetail label="School" value={user.school} />
                            <ProfileDetail label="Faculty" value={user.faculty} />
                            <ProfileDetail label="Department" value={user.department} />
                            <ProfileDetail label="Level" value={user.level} />
                        </>
                    )}

                    {/* Industrial Supervisor Specific Fields */}
                    {user.role === 'industrial-supervisor' && (
                        <>
                            <ProfileDetail label="Company" value={user.company} />
                            <ProfileDetail label="Role in Company" value={user.companyRole} />
                            <ProfileDetail label="Supervisor Code" value={user.supervisorCode} />
                        </>
                    )}

                    {/* Academic Supervisor Specific Fields */}
                    {user.role === 'academic-supervisor' && (
                        <>
                            <ProfileDetail label="Supervisor Code" value={user.supervisorCode} />
                        </>
                    )}
                </dl>
            </div>
        </Card>
    );
};

export default Profile;