
import React, { useState, useEffect, useCallback } from 'react';
import type { User, LogbookEntry, Evaluation } from '../../types';
import { LogbookStatus } from '../../types';
import { useAuth } from '../../App';
import { getSupervisorStudents, getLogbookEntries, saveEvaluation, getEvaluation } from '../../services/mockApi';
import { Card, Button, Modal, Textarea, Spinner, Input } from '../common';
import { ICONS } from '../../constants';


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


const StudentEvaluationView: React.FC<{ student: User, onClose: () => void }> = ({ student, onClose }) => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LogbookEntry[]>([]);
    const [evaluation, setEvaluation] = useState<Partial<Evaluation>>({
        grade: 0,
        comments: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [fetchedEntries, fetchedEvaluation] = await Promise.all([
            getLogbookEntries(student.id),
            getEvaluation(student.id)
        ]);
        setEntries(fetchedEntries);
        if (fetchedEvaluation) {
            setEvaluation(fetchedEvaluation);
        }
        setIsLoading(false);
    }, [student.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSaveEvaluation = async () => {
        if(!user) return;
        setIsSaving(true);
        const evalToSave = {
            ...evaluation,
            studentId: student.id,
            academicSupervisorId: user.id,
            date: new Date().toISOString().split('T')[0],
        };
        await saveEvaluation(evalToSave as Evaluation);
        setIsSaving(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Evaluation for {student.firstName} {student.lastName}</h3>
                <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Back to List</Button>
            </div>
            {isLoading ? <Spinner /> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="Logbook Entries">
                        <div className="overflow-auto max-h-96">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-4 py-2">Date</th>
                                        <th scope="col" className="px-4 py-2">Task Summary</th>
                                        <th scope="col" className="px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map(entry => (
                                        <tr key={entry.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{entry.date}</td>
                                            <td className="px-4 py-2 truncate max-w-sm">{entry.tasks}</td>
                                            <td className="px-4 py-2"><StatusBadge status={entry.status} /></td>
                                        </tr>
                                    ))}
                                     {entries.length === 0 && <tr><td colSpan={3} className="text-center py-4">No entries found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                <div>
                     <Card title="Grading & Evaluation">
                        <div className="space-y-4">
                            <Input 
                                label="Grade (out of 100)"
                                type="number"
                                name="grade"
                                value={String(evaluation.grade || '')}
                                onChange={e => setEvaluation(prev => ({ ...prev, grade: parseInt(e.target.value) || 0 }))}
                            />
                            <Textarea 
                                label="Evaluation Comments"
                                name="comments"
                                rows={8}
                                value={evaluation.comments || ''}
                                onChange={e => setEvaluation(prev => ({ ...prev, comments: e.target.value }))}
                            />
                            <Button onClick={handleSaveEvaluation} className="w-full" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Evaluation'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
            )}
        </div>
    );
};


const AcademicSupervisorDashboard: React.FC = () => {
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
    }, [user]);

    const filteredStudents = students.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedStudent) {
        return <StudentEvaluationView student={selectedStudent} onClose={() => setSelectedStudent(null)} />;
    }

    return (
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
                                    <Button onClick={() => setSelectedStudent(student)} className="text-sm py-1 px-3">Evaluate</Button>
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
    );
};

export default AcademicSupervisorDashboard;