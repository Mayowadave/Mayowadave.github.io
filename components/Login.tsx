import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Role, User } from '../types';
import { useAuth } from '../App';
import { Card, Button, Input } from './common';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl lg:grid lg:grid-cols-2 rounded-lg shadow-2xl overflow-hidden bg-white">
        <div className="hidden lg:block bg-indigo-600 p-12 flex flex-col justify-center text-white">
            <h1 className="text-4xl font-bold mb-4">SIWES Logbook Pro</h1>
            <p className="text-indigo-200">Streamline your industrial training experience. Log, track, and get approved seamlessly.</p>
        </div>
        <div className="p-8 md:p-12">
            {mode === 'signin' 
                ? <SignInForm onSwitchMode={() => setMode('signup')} /> 
                : <SignUpForm onSwitchMode={() => setMode('signin')} />
            }
        </div>
      </div>
    </div>
  );
};

const SignInForm: React.FC<{ onSwitchMode: () => void }> = ({ onSwitchMode }) => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ email, password });
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Sign In</h2>
            <p className="text-gray-500 mb-6">Welcome back! Please enter your details.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input label="Email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Input label="Password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                </Button>
                <p className="text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button type="button" onClick={onSwitchMode} className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign up
                    </button>
                </p>
            </form>
        </div>
    );
};

const SignUpForm: React.FC<{ onSwitchMode: () => void }> = ({ onSwitchMode }) => {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<Partial<User> & { password?: string, confirmPassword?: string }>({
        firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'student',
        gender: 'Male', school: '', faculty: '', department: '', level: '100', company: '', companyRole: '', avatar: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        
        setLoading(true);
        const { confirmPassword, ...userData } = formData;
        
        try {
            await signup(userData as Omit<User, 'id'>);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'An error occurred during sign up.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-500 mb-6">Let's get you started on your SIWES journey.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} required />
                    <Input label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} required />
                 </div>
                 <Input label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} required />
                 <div className="grid grid-cols-2 gap-4">
                    <Input label="Password" name="password" type="password" value={formData.password || ''} onChange={handleChange} required />
                    <Input label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword || ''} onChange={handleChange} required />
                 </div>
                 <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                    <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="student">Student</option>
                        <option value="industrial-supervisor">Industrial Supervisor</option>
                        <option value="academic-supervisor">Academic Supervisor</option>
                    </select>
                </div>

                {formData.role === 'student' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="School" name="school" value={formData.school || ''} onChange={handleChange} required />
                            <Input label="Faculty" name="faculty" value={formData.faculty || ''} onChange={handleChange} required />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <Input label="Department" name="department" value={formData.department || ''} onChange={handleChange} required />
                            <Input label="Level" name="level" value={formData.level || ''} onChange={handleChange} required />
                        </div>
                        <div>
                             <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">Passport Photograph</label>
                            <div className="mt-1 flex items-center space-x-4">
                                <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                                    {formData.avatar ? (
                                        <img className="h-full w-full object-cover" src={formData.avatar} alt="Avatar Preview" />
                                    ) : (
                                        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    )}
                                </span>
                                 <input type="file" id="avatar" name="avatar" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                            </div>
                        </div>
                    </>
                )}

                {formData.role === 'industrial-supervisor' && (
                     <>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Company" name="company" value={formData.company || ''} onChange={handleChange} required />
                            <Input label="Role in Company" name="companyRole" value={formData.companyRole || ''} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">Passport Photograph</label>
                            <div className="mt-1 flex items-center space-x-4">
                                <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                                    {formData.avatar ? (
                                        <img className="h-full w-full object-cover" src={formData.avatar} alt="Avatar Preview" />
                                    ) : (
                                        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    )}
                                </span>
                                 <input type="file" id="avatar" name="avatar" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                            </div>
                        </div>
                    </>
                )}
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
                <p className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <button type="button" onClick={onSwitchMode} className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign in
                    </button>
                </p>
            </form>
        </div>
    );
};


export default AuthPage;