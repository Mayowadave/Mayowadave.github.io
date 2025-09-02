
import React, { useState, useEffect, useCallback } from 'react';
import type { LogbookEntry, User } from '../../types';
import { LogbookStatus } from '../../types';
import { useAuth } from '../../App';
import { getLogbookEntries, saveLogbookEntry, submitLogbookForApproval, getStudentById, linkStudentToSupervisor, linkStudentToAcademicSupervisor } from '../../services/mockApi';
import { Card, Button, Modal, Input, Textarea, Spinner } from '../common';
import { ICONS } from '../../constants';

// Since we are in a single file setup, we can't use jspdf types directly
// We'll have to use `any` for the jsPDF instance.
declare const jspdf: any;


const LogbookEntryForm: React.FC<{
    entry?: LogbookEntry | null;
    onSave: (entry: LogbookEntry) => void;
    onClose: () => void;
}> = ({ entry, onSave, onClose }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        date: '',
        week: 1,
        day: 'Monday',
        tasks: '',
        skillsLearned: '',
    });

    useEffect(() => {
        if (entry) {
            setFormData({
                date: entry.date,
                week: entry.week,
                day: entry.day,
                tasks: entry.tasks,
                skillsLearned: entry.skillsLearned,
            });
        } else {
             setFormData({
                date: new Date().toISOString().split('T')[0],
                week: 1,
                day: 'Monday',
                tasks: '',
                skillsLearned: '',
            });
        }
    }, [entry]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'week' ? parseInt(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        const entryToSave = {
            id: entry?.id,
            studentId: user.id,
            ...formData,
        };
        // @ts-ignore
        const saved = await saveLogbookEntry(entryToSave);
        onSave(saved);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Date" type="date" name="date" value={formData.date} onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Week" type="number" name="week" value={String(formData.week)} onChange={handleChange} required />
                 <div>
                    <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                    <select id="day" name="day" value={formData.day} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>
            <Textarea label="Tasks Performed" name="tasks" value={formData.tasks} onChange={handleChange} required />
            <Textarea label="Skills Learned" name="skillsLearned" value={formData.skillsLearned} onChange={handleChange} required />
            <div className="flex justify-end space-x-2 pt-4">
                <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</Button>
                <Button type="submit">Save Entry</Button>
            </div>
        </form>
    );
};

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

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LogbookEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
    const [supervisors, setSupervisors] = useState<{ industrial: User | null, academic: User | null }>({ industrial: null, academic: null });
    
    const [supervisorCode, setSupervisorCode] = useState('');
    const [linkStatus, setLinkStatus] = useState({ message: '', type: '' });
    
    const [academicSupervisorCode, setAcademicSupervisorCode] = useState('');
    const [academicLinkStatus, setAcademicLinkStatus] = useState({ message: '', type: '' });


    const fetchEntries = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const fetchedEntries = await getLogbookEntries(user.id);
        setEntries(fetchedEntries);
        
        const studentDetails = await getStudentById(user.id);
        if(studentDetails?.industrialSupervisorId) {
            const industrial = await getStudentById(studentDetails.industrialSupervisorId);
            setSupervisors(prev => ({...prev, industrial: industrial || null}));
        } else {
            setSupervisors(prev => ({...prev, industrial: null}));
        }
        if(studentDetails?.academicSupervisorId) {
            const academic = await getStudentById(studentDetails.academicSupervisorId);
            setSupervisors(prev => ({...prev, academic: academic || null}));
        } else {
             setSupervisors(prev => ({...prev, academic: null}));
        }

        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const handleSave = () => {
        setIsModalOpen(false);
        setSelectedEntry(null);
        fetchEntries();
    };
    
    const openNewEntryModal = () => {
        setSelectedEntry(null);
        setIsModalOpen(true);
    };

    const openEditEntryModal = (entry: LogbookEntry) => {
        setSelectedEntry(entry);
        setIsModalOpen(true);
    };
    
    const handleSubmitForApproval = async () => {
        if (!user) return;
        await submitLogbookForApproval(user.id);
        fetchEntries();
    };
    
    const handleLinkSupervisor = async () => {
        if (!user || !supervisorCode) return;
        setLinkStatus({ message: 'Linking...', type: 'loading' });
        const result = await linkStudentToSupervisor(user.id, supervisorCode.trim().toUpperCase());
        if (result.success) {
            setLinkStatus({ message: result.message, type: 'success' });
            fetchEntries(); // Refresh data to show new supervisor
        } else {
            setLinkStatus({ message: result.message, type: 'error' });
        }
    };

    const handleLinkAcademicSupervisor = async () => {
        if (!user || !academicSupervisorCode) return;
        setAcademicLinkStatus({ message: 'Linking...', type: 'loading' });
        const result = await linkStudentToAcademicSupervisor(user.id, academicSupervisorCode.trim().toUpperCase());
        if (result.success) {
            setAcademicLinkStatus({ message: result.message, type: 'success' });
            fetchEntries(); // Refresh data to show new supervisor
        } else {
            setAcademicLinkStatus({ message: result.message, type: 'error' });
        }
    };

    const exportToPDF = () => {
        if (!user) return;
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        const fullName = `${user.firstName} ${user.lastName}`;
    
        doc.setFontSize(18);
        doc.text("SIWES Logbook", 14, 22);
        doc.setFontSize(11);
        doc.text(`Student: ${fullName}`, 14, 30);
        doc.text(`Student ID: ${user.studentId || 'N/A'}`, 14, 36);
    
        const tableColumn = ["Date", "Day", "Tasks", "Skills Learned", "Status"];
        const tableRows: (string | number)[][] = [];
    
        entries.forEach(entry => {
            const entryData = [
                entry.date,
                entry.day,
                entry.tasks.replace(/\n/g, ' '),
                entry.skillsLearned.replace(/\n/g, ' '),
                entry.status,
            ];
            tableRows.push(entryData);
        });
    
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
        });
        
        doc.save(`${user.firstName}_${user.lastName}_logbook.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card title="Industrial Supervisor">
                    {supervisors.industrial ? (
                        <div className="flex items-center space-x-4">
                            <img 
                                className="h-20 w-20 rounded-full object-cover" 
                                src={supervisors.industrial.avatar || `https://i.pravatar.cc/150?u=${supervisors.industrial.id}`} 
                                alt={`${supervisors.industrial.firstName}'s avatar`} 
                            />
                            <div>
                                <p className="font-bold text-lg text-gray-800">{supervisors.industrial.firstName} {supervisors.industrial.lastName}</p>
                                <p className="text-sm text-gray-600">{supervisors.industrial.companyRole || 'Supervisor'} at {supervisors.industrial.company || 'N/A'}</p>
                                <p className="text-sm text-gray-500 mt-1">{supervisors.industrial.email || 'No email provided'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500">You are not linked to a supervisor yet. Enter their unique ID below.</p>
                            <div className="flex items-center gap-2">
                                <Input 
                                    name="supervisorCode"
                                    placeholder="e.g., IND-JDOE12"
                                    value={supervisorCode}
                                    onChange={(e) => setSupervisorCode(e.target.value)}
                                />
                                <Button onClick={handleLinkSupervisor} disabled={linkStatus.type === 'loading'}>
                                    {linkStatus.type === 'loading' ? 'Linking...' : 'Link'}
                                </Button>
                            </div>
                            {linkStatus.message && (
                                <p className={`text-sm ${linkStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                    {linkStatus.message}
                                </p>
                            )}
                        </div>
                    )}
                </Card>
                 <Card title="Academic Supervisor">
                    {supervisors.academic ? (
                        <div className="flex items-center space-x-4">
                            <img 
                                className="h-20 w-20 rounded-full object-cover" 
                                src={supervisors.academic.avatar || `https://i.pravatar.cc/150?u=${supervisors.academic.id}`} 
                                alt={`${supervisors.academic.firstName}'s avatar`} 
                            />
                            <div>
                                <p className="font-bold text-lg text-gray-800">{supervisors.academic.firstName} {supervisors.academic.lastName}</p>
                                <p className="text-sm text-gray-600">Academic Supervisor</p>
                                <p className="text-sm text-gray-500 mt-1">{supervisors.academic.email || 'No email provided'}</p>
                            </div>
                        </div>
                    ) : (
                         <div className="space-y-3">
                            <p className="text-sm text-gray-500">You are not linked to an academic supervisor yet. Enter their unique ID below.</p>
                            <div className="flex items-center gap-2">
                                <Input 
                                    name="academicSupervisorCode"
                                    placeholder="e.g., ACAD-HMIL99"
                                    value={academicSupervisorCode}
                                    onChange={(e) => setAcademicSupervisorCode(e.target.value)}
                                />
                                <Button onClick={handleLinkAcademicSupervisor} disabled={academicLinkStatus.type === 'loading'}>
                                    {academicLinkStatus.type === 'loading' ? 'Linking...' : 'Link'}
                                </Button>
                            </div>
                            {academicLinkStatus.message && (
                                <p className={`text-sm ${academicLinkStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                    {academicLinkStatus.message}
                                </p>
                            )}
                        </div>
                    )}
                </Card>
            </div>
            
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">My Logbook</h3>
                    <div className="flex space-x-2">
                        <Button onClick={handleSubmitForApproval} className="bg-green-600 hover:bg-green-700">Submit Drafts</Button>
                        <Button onClick={exportToPDF} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">{ICONS.pdf} Export PDF</Button>
                        <Button onClick={openNewEntryModal}>+ New Entry</Button>
                    </div>
                </div>
                {isLoading ? <Spinner /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Week/Day</th>
                                <th scope="col" className="px-6 py-3">Tasks Performed</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Feedback</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{entry.date}</td>
                                    <td className="px-6 py-4">W{entry.week}, {entry.day}</td>
                                    <td className="px-6 py-4 max-w-sm truncate">{entry.tasks}</td>
                                    <td className="px-6 py-4"><StatusBadge status={entry.status} /></td>
                                    <td className="px-6 py-4 text-xs italic">{entry.supervisorFeedback || 'No feedback yet.'}</td>
                                    <td className="px-6 py-4">
                                        {entry.status === LogbookStatus.DRAFT || entry.status === LogbookStatus.REJECTED ? (
                                        <button onClick={() => openEditEntryModal(entry)} className="font-medium text-indigo-600 hover:text-indigo-900">
                                            Edit
                                        </button>
                                        ) : (
                                        <span className="text-gray-400">Locked</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                             {entries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        You have no logbook entries yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEntry(null); }} title={selectedEntry ? 'Edit Logbook Entry' : 'New Logbook Entry'}>
                <LogbookEntryForm entry={selectedEntry} onSave={handleSave} onClose={() => { setIsModalOpen(false); setSelectedEntry(null); }} />
            </Modal>
        </div>
    );
};

export default StudentDashboard;
