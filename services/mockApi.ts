
import type { User, LogbookEntry, Evaluation, Role } from '../types';
import { LogbookStatus } from '../types';
// Fix: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKe8GrFGsZedcg4yhr7mHq0N6nlb003YY",
  authDomain: "siwes-management.firebaseapp.com",
  databaseURL: "https://siwes-management-default-rtdb.firebaseio.com",
  projectId: "siwes-management",
  storageBucket: "siwes-management.firebasestorage.app",
  messagingSenderId: "420217381722",
  appId: "1:420217381722:web:6375fa57b420a2d6cd8963",
  measurementId: "G-TGDGQ8LG1P"
};

// Fix: Updated Firebase initialization to use the v8 compat API.
// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
export const auth = firebase.auth();
export const db = firebase.database();

const dbRef = db.ref();

// Helper to convert snapshot to array
const snapshotToArray = (snapshot: any) => {
    if (!snapshot.exists()) return [];
    const val = snapshot.val();
    return Object.keys(val).map(key => ({ ...val[key], id: key }));
};

// --- API Functions ---

export const getLogbookEntries = async (studentId: string): Promise<LogbookEntry[]> => {
    // Fix: Updated to v8 compat database call.
    const snapshot = await dbRef.child(`logbookEntries/${studentId}`).get();
    const entries = snapshotToArray(snapshot);
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const saveLogbookEntry = async (entry: Omit<LogbookEntry, 'id' | 'status'> & { id?: string }): Promise<LogbookEntry> => {
    const { id, studentId, ...data } = entry;
    if (id) {
        // Update existing entry
        // Fix: Updated to v8 compat database call.
        const entryRef = db.ref(`logbookEntries/${studentId}/${id}`);
        const snapshot = await entryRef.get();
        if (snapshot.exists()) {
            const originalEntry = snapshot.val();
            const updatedData: Partial<LogbookEntry> = { ...data };
            if (originalEntry.status === LogbookStatus.REJECTED) {
                 updatedData.status = LogbookStatus.PENDING_APPROVAL;
            }
            // Fix: Updated to v8 compat database call.
            await entryRef.update(updatedData);
            return { ...originalEntry, ...updatedData, id };
        }
    }
    // Create new entry
    // Fix: Updated to v8 compat database call.
    const newEntryRef = db.ref(`logbookEntries/${studentId}`).push();
    const newEntry: Omit<LogbookEntry, 'id'> = { ...data, studentId, status: LogbookStatus.DRAFT };
    // Fix: Updated to v8 compat database call.
    await newEntryRef.set(newEntry);
    return { ...newEntry, id: newEntryRef.key! };
};

export const submitLogbookForApproval = async (studentId: string): Promise<void> => {
    // Fix: Updated to v8 compat database call.
    const entriesRef = db.ref(`logbookEntries/${studentId}`);
    const snapshot = await entriesRef.get();
    if (!snapshot.exists()) return;

    const updates: { [key: string]: any } = {};
    snapshot.forEach(childSnapshot => {
        const entry = childSnapshot.val();
        if (entry.status === LogbookStatus.DRAFT) {
            updates[`/logbookEntries/${studentId}/${childSnapshot.key}/status`] = LogbookStatus.PENDING_APPROVAL;
        }
    });

    if (Object.keys(updates).length > 0) {
        // Fix: Updated to v8 compat database call.
        await db.ref().update(updates);
    }
};

// Fix: Implemented the function to correctly update logbook status with studentId, entryId, and feedback.
export const updateLogbookStatus = async (studentId: string, entryId: string, status: LogbookStatus, feedback?: string): Promise<LogbookEntry> => {
    const entryRef = db.ref(`logbookEntries/${studentId}/${entryId}`);
    const snapshot = await entryRef.get();

    if (!snapshot.exists()) {
        throw new Error("Logbook entry not found.");
    }

    const updates: Partial<LogbookEntry> = { status };
    if (feedback !== undefined) {
        updates.supervisorFeedback = feedback;
    }

    await entryRef.update(updates);
    const updatedEntry = { ...snapshot.val(), ...updates, id: entryId };
    return updatedEntry;
};


export const getUserById = async (userId: string): Promise<User | null> => {
    // Fix: Updated to v8 compat database call.
    const snapshot = await dbRef.child(`users/${userId}`).get();
    if (snapshot.exists()) {
        return { ...snapshot.val(), id: userId };
    }
    return null;
};
export const getStudentById = getUserById; // Alias for compatibility


export const getSupervisorStudents = async (supervisorId: string): Promise<User[]> => {
    const supervisor = await getUserById(supervisorId);
    if (!supervisor || !supervisor.assignedStudentIds) return [];
    
    const studentPromises = supervisor.assignedStudentIds.map(studentId => getUserById(studentId));
    const students = await Promise.all(studentPromises);
    
    return students.filter((s): s is User => s !== null);
};

export const getAllUsers = async (): Promise<User[]> => {
    // Fix: Updated to v8 compat database call.
    const snapshot = await dbRef.child(`users`).get();
    return snapshotToArray(snapshot);
};

export const saveUser = async (user: Omit<User, 'id'> & { id?: string }): Promise<User> => {
    const { id, ...data } = user;
    let userId = id;

    if (!userId) { // Creating a new user (likely from admin panel, without auth)
        // Fix: Updated to v8 compat database call.
        const newUserRef = db.ref('users').push();
        userId = newUserRef.key!;
    }

    const userDataWithId = { ...data, id: userId };
    
    // When creating new supervisors, generate their code.
    if (!data.supervisorCode) {
        const generateCode = (prefix: string) => {
            const codePart1 = data.firstName.substring(0, 1).toUpperCase();
            const codePart2 = data.lastName.substring(0, 4).toUpperCase();
            return `${prefix}-${codePart1}${codePart2}${Math.floor(Math.random() * 100)}`;
        };
        if (data.role === 'industrial-supervisor') {
            (userDataWithId as User).supervisorCode = generateCode('IND');
        } else if (data.role === 'academic-supervisor') {
            (userDataWithId as User).supervisorCode = generateCode('ACAD');
        }
    }
    
    // Fix: Updated to v8 compat database call.
    await db.ref('users/' + userId).set(userDataWithId);
    return { ...data, id: userId } as User;
};

export const deleteUser = async (userId: string): Promise<void> => {
    // This only deletes the user from the database.
    // The auth user still exists. Proper deletion requires admin SDK on a backend.
    // Fix: Updated to v8 compat database call.
    await db.ref(`users/${userId}`).remove();
};

export const getEvaluation = async(studentId: string): Promise<Evaluation | undefined> => {
    // Fix: Updated to v8 compat database call.
    const snapshot = await dbRef.child(`evaluations/${studentId}`).get();
    return snapshot.exists() ? snapshot.val() : undefined;
}

export const saveEvaluation = async (evaluation: Omit<Evaluation, 'id'> & { id?: string }): Promise<Evaluation> => {
    const { studentId } = evaluation;
    // Fix: Updated to v8 compat database call.
    const evalRef = db.ref(`evaluations/${studentId}`);
    await evalRef.set(evaluation);
    return { ...evaluation, id: studentId }; // Using studentId as evaluation ID
};

export const linkStudentToSupervisor = async (studentId: string, supervisorCode: string): Promise<{ success: boolean; message: string; supervisor?: User }> => {
    // Fix: Updated to v8 compat database call.
    const usersRef = db.ref('users');
    const q = usersRef.orderByChild('supervisorCode').equalTo(supervisorCode);
    const snapshot = await q.get();

    if (!snapshot.exists()) {
        return { success: false, message: 'Invalid Supervisor ID.' };
    }

    const supervisorId = Object.keys(snapshot.val())[0];
    const supervisor = { ...snapshot.val()[supervisorId], id: supervisorId };

    if (supervisor.role !== 'industrial-supervisor') {
         return { success: false, message: 'This code does not belong to an Industrial Supervisor.' };
    }
    
    const student = await getUserById(studentId);
    if (!student) {
        return { success: false, message: 'Student not found.' };
    }

    const updates: { [key: string]: any } = {};
    updates[`/users/${studentId}/industrialSupervisorId`] = supervisorId;
    const newAssignedIds = [...(supervisor.assignedStudentIds || []), studentId];
    updates[`/users/${supervisorId}/assignedStudentIds`] = Array.from(new Set(newAssignedIds)); // Ensure uniqueness

    // Fix: Updated to v8 compat database call.
    await db.ref().update(updates);

    return { success: true, message: `Successfully linked to ${supervisor.firstName} ${supervisor.lastName}.`, supervisor };
};

export const linkStudentToAcademicSupervisor = async (studentId: string, supervisorCode: string): Promise<{ success: boolean; message: string; supervisor?: User }> => {
    // Fix: Updated to v8 compat database call.
    const usersRef = db.ref('users');
    const q = usersRef.orderByChild('supervisorCode').equalTo(supervisorCode);
    const snapshot = await q.get();

    if (!snapshot.exists()) {
        return { success: false, message: 'Invalid Academic Supervisor ID.' };
    }

    const supervisorId = Object.keys(snapshot.val())[0];
    const supervisor = { ...snapshot.val()[supervisorId], id: supervisorId };

     if (supervisor.role !== 'academic-supervisor') {
         return { success: false, message: 'This code does not belong to an Academic Supervisor.' };
    }

    const student = await getUserById(studentId);
    if (!student) {
        return { success: false, message: 'Student not found.' };
    }

    const updates: { [key: string]: any } = {};
    updates[`/users/${studentId}/academicSupervisorId`] = supervisorId;
    const newAssignedIds = [...(supervisor.assignedStudentIds || []), studentId];
    updates[`/users/${supervisorId}/assignedStudentIds`] = Array.from(new Set(newAssignedIds));

    // Fix: Updated to v8 compat database call.
    await db.ref().update(updates);
    
    return { success: true, message: `Successfully linked to ${supervisor.firstName} ${supervisor.lastName}.`, supervisor };
};
