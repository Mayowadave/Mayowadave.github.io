import React, { useState, useEffect, useCallback } from 'react';
import type { User, LogbookEntry } from '../../types';
import { LogbookStatus } from '../../types';
import { useAuth } from '../../App';
import { getSupervisorStudents, getLogbookEntries, updateLogbookStatus } from '../../services/mockApi';
import { Card, Button, Modal, Textarea, Spinner } from '../common';
import { ICONS } from '../../constants';

// A proper implementation for updateLogbookStatus requires the student ID.
// This is a new function that will be implemented in the api file.
// We are faking it here until the file is created.
const updateLogbookStatusWithStudentId = async (studentId: string, entryId: string, status: LogbookStatus, feedback?: string): Promise<LogbookEntry> => {
    const api = await import('../../services/mockApi');
    // @ts-ignore
    return api.updateLogbookStatus(studentId, entryId, status, feedback);
}


const StatusBadge: React.FC<{ status: LogbookStatus }> = ({ status }) => {
    const baseClasses = "px-2.5 py-0.5 rounded-full text-xs font-medium";
    const statusClasses = {
        [LogbookStatus.DRAFT]: "bg-gray-100 text-gray-800",
        [LogbookStatus.PENDING_APPROVAL]: "bg-yellow-100 text-yellow-800",
        [LogbookStatus.APPROVED]: "bg-green-100 text-green-800",
        [LogbookStatus.REJECTED]: "bg-red-100 text-red-800",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};


const StudentLogbookView: React.FC<{ student: User, onClose: () => void }> = ({ student, onClose }) => {
    const [entries, setEntries] = useState<LogbookEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
    const [feedback, setFeedback] = useState('');

    const fetchEntries = useCallback(async () => {
        setIsLoading(true);
        const fetchedEntries = await getLogbookEntries(student.id);
        setEntries(fetchedEntries);
        setIsLoading(false);
    }, [student.id]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const handleAction = async (entryId: string, status: LogbookStatus, feedbackText?: string) => {
        await updateLogbookStatusWithStudentId(student.id, entryId, status, feedbackText);
        setFeedbackModalOpen(false);
        setSelectedEntry(null);
        setFeedback('');
        fetchEntries();
    }

    const openFeedbackModal = (entry: LogbookEntry) => {
        setSelectedEntry(entry);
        setFeedback(entry.supervisorFeedback || '');
        setFeedbackModalOpen(true);
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Logbook for {student.firstName} {student.lastName}</h3>
                <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Back to List</Button>
            </div>
            {isLoading ? <Spinner /> : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Tasks</th>
                            <th scope="col" className="px-6 py-3">Skills</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(entry => (
                            <tr key={entry.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">{entry.date}</td>
                                <td className="px-6 py-4 max-w-xs truncate">{entry.tasks}</td>
                                <td className="px-6 py-4 max-w-xs truncate">{entry.skillsLearned}</td>
                                <td className="px-6 py-4"><StatusBadge status={entry.status} /></td>
                                <td className="px-6 py-4">
                                    {entry.status === LogbookStatus.PENDING_APPROVAL ? (
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleAction(entry.id, LogbookStatus.APPROVED)} className="text-green-600 hover:text-green-800">{ICONS.approve}</button>
                                            <button onClick={() => openFeedbackModal(entry)} className="text-red-600 hover:text-red-800">{ICONS.reject}</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => openFeedbackModal(entry)} className="text-blue-600 hover:text-blue-800">{ICONS.feedback}</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {entries.length === 0 && <p className="text-center py-8 text-gray-500">This student has no logbook entries.</p>}
            </div>
            )}
            <Modal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} title={`Feedback for ${selectedEntry?.date}`}>
                <div className="space-y-4">
                    <p><strong>Task:</strong> {selectedEntry?.tasks}</p>
                    <Textarea label="Feedback / Reason for Rejection" name="feedback" value={feedback} onChange={e => setFeedback(e.target.value)} />
                    <div className="flex justify-end space-x-2">
                        <Button onClick={() => setFeedbackModalOpen(false)} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</Button>
                        <Button onClick={() => handleAction(selectedEntry!.id, LogbookStatus.APPROVED, feedback)} className="bg-green-600 hover:bg-green-700">Approve with Feedback</Button>
                        <Button onClick={() => handleAction(selectedEntry!.id, LogbookStatus.REJECTED, feedback)} className="bg-red-600 hover:bg-red-700">Reject</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


const IndustrialSupervisorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!user) return;
            setIsLoading(true);
            const fetchedStudents = await getSupervisorStudents(user.id);
            setStudents(fetchedStudents);
            setIsLoading(false);
        };
        fetchStudents();
    }, [user, selectedStudent]);

    const filteredStudents = students.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedStudent) {
        return <Card><StudentLogbookView student={selectedStudent} onClose={() => setSelectedStudent(null)} /></Card>;
    }

    return (
        <div className="space-y-6">
            <Card title="Your Supervisor Code">
                <p className="text-gray-600 mb-2">Share this code with your students to allow them to link to your account.</p>
                <div className="bg-gray-100 p-3 rounded-md text-center">
                    <p className="text-2xl font-mono font-bold text-indigo-600 tracking-widest">{user?.supervisorCode || 'N/A'}</p>
                </div>
            </Card>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Assigned Students</h3>
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                {isLoading ? <Spinner /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Student ID</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <div className="flex items-center">
                                            <img className="h-8 w-8 rounded-full object-cover mr-3" src={student.avatar || `https://i.pravatar.cc/150?u=${student.id}`} alt={`${student.firstName}'s avatar`} />
                                            <span>{student.firstName} {student.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{student.email}</td>
                                    <td className="px-6 py-4">{student.studentId}</td>
                                    <td className="px-6 py-4">
                                        <Button onClick={() => setSelectedStudent(student)} className="text-sm py-1 px-3">View Logbook</Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">
                                        No students found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                )}
            </Card>
        </div>
    );
};

export default IndustrialSupervisorDashboard;