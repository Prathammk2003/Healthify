'use client';
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Input,
  Select,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
} from '@/components/ui';
import {
  UserIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon,
  PlusCircleIcon,
  UserPlusIcon,
  AlertTriangle,
  InfoIcon,
  XCircleIcon,
  CheckCircleIcon,
  RefreshCw,
  Users,
  Settings,
  Shield,
  Crown,
  Activity,
  TrendingUp,
  Calendar,
  Heart,
  Stethoscope,
  Target,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import Loader from '@/components/Loader';

export default function AdminDashboard() {
  const { isAuthenticated, userId, token, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch users on component mount or when token changes
  useEffect(() => {
    if (!isAuthenticated || !token || !isAdmin) {
      return;
    }
    
    fetchUsers();
  }, [isAuthenticated, token, isAdmin]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/login');
    } else if (isAuthenticated && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, router]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Make sure we have a valid array of users
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setError('Received invalid response format from server.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create a new user
  const createUser = async () => {
    try {
      setLoading(true);
      setError(null);
      setFormErrors({});
      
      // Validate form fields
      const errors = {};
      if (!formData.name) errors.name = 'Name is required';
      if (!formData.email) errors.email = 'Email is required';
      if (!formData.password) errors.password = 'Password is required';
      if (!formData.role) errors.role = 'Role is required';
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      // Reset form and show success message
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'patient',
      });
      setIsCreateDialogOpen(false);
      setSuccessMessage('User created successfully');
      
      // Refresh the user list
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update an existing user
  const updateUser = async () => {
    try {
      setLoading(true);
      setError(null);
      setFormErrors({});
      
      // Validate form fields
      const errors = {};
      if (!formData.name) errors.name = 'Name is required';
      if (!formData.email) errors.email = 'Email is required';
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setLoading(false);
        return;
      }
      
      // Use path parameter format for the dynamic [id] route
      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }
      
      // Reset form and show success message
      setIsEditDialogOpen(false);
      setSuccessMessage('User updated successfully');
      
      // Refresh the user list
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete a user
  const deleteUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use path parameter format for the dynamic [id] route
      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      // Reset selected user and show success message
      setSelectedUser(null);
      setIsDeleteDialogOpen(false);
      setSuccessMessage('User deleted successfully');
      
      // Refresh the user list
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Open the edit dialog and populate form with user data
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',  // Don't prefill password
    });
    setIsEditDialogOpen(true);
  };

  // Open the delete dialog
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  if (!isAuthenticated || !isAdmin) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-slate-800 dark:to-purple-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        
        {/* Floating particles */}
        <div className="particles">
          {/* Particles will be rendered after client hydration to prevent mismatch */}
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-600 via-blue-600 to-purple-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-500"></div>
          
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                    <Crown className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold mb-2 text-shimmer">Admin Control Center</h1>
                    <p className="text-xl text-white/90">
                      Comprehensive system management and user administration
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <Shield className="h-5 w-5" />
                    <span>Secure Access</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-blue-200 transition-colors">
                    <Activity className="h-5 w-5 text-blue-300" />
                    <span>System Active</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-purple-200 transition-colors">
                    <Target className="h-5 w-5 text-purple-300" />
                    <span>{users.length || 0} Total Users</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <Settings className="h-16 w-16 text-white animate-spin-slow" />
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse-ring"></div>
                  <div className="absolute inset-2 rounded-full border border-white/10 animate-pulse-ring" style={{animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced floating elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="w-20 h-20 border-2 border-white rounded-full animate-ping"></div>
          </div>
          <div className="absolute bottom-4 left-4 opacity-20">
            <div className="w-16 h-16 border border-white rounded-full animate-bounce"></div>
          </div>
          <div className="absolute top-1/2 right-1/4 opacity-10">
            <div className="w-8 h-8 bg-white rounded-full animate-float"></div>
          </div>
        </div>
      {successMessage && (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
          <div className="relative z-10 flex items-center">
            <CheckCircleIcon className="mr-3 h-5 w-5 animate-bounce" />
            <span className="font-medium flex-1">{successMessage}</span>
            <button 
              className="ml-4 text-emerald-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
              onClick={() => setSuccessMessage('')}
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
          <div className="relative z-10 flex items-center">
            <AlertTriangle className="mr-3 h-5 w-5 animate-pulse" />
            <span className="font-medium flex-1">{error}</span>
            <button 
              className="ml-4 text-red-200 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
              onClick={() => setError(null)}
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced User Management Card */}
      <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 via-blue-500/5 to-purple-500/5 group-hover:from-slate-500/10 group-hover:via-blue-500/10 group-hover:to-purple-500/10 transition-all duration-500"></div>
        
        {/* Floating background elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full animate-float"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
        
        <div className="relative z-10 p-8">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent mb-2 group-hover:from-slate-700 group-hover:to-blue-700 transition-all duration-300">
                User Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                Manage all users in the system. Create, edit, or delete user accounts.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="group/icon relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-500 to-blue-500 rounded-xl opacity-0 group-hover/icon:opacity-20 transition-opacity duration-300"></div>
                <div className="relative p-3 bg-gradient-to-r from-slate-500 to-blue-500 rounded-xl group-hover/icon:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Search and Controls */}
          <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-xl border-gray-200/50 bg-white/80 backdrop-blur-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200/50 transition-all duration-300"
              />
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="default"
                onClick={fetchUsers}
                disabled={loading}
                className="group/btn h-12 px-6 bg-white/80 backdrop-blur-sm border-gray-200/50 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className={`mr-2 h-4 w-4 transition-transform duration-300 ${loading ? 'animate-spin' : 'group-hover/btn:rotate-180'}`} />
                Refresh
              </Button>
              <Button 
                onClick={() => {
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'patient',
                  });
                  setIsCreateDialogOpen(true);
                }}
                className="group/btn h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <UserPlusIcon className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                Add User
              </Button>
            </div>
          </div>

          {/* Enhanced Table Section */}
          {loading ? (
            <div className="relative rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200/50 p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-purple-300 border-t-transparent rounded-full animate-ping mx-auto opacity-20"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Loading Users</h3>
                <p className="text-gray-600 dark:text-gray-400">Fetching user data from the system...</p>
              </div>
            </div>
          ) : (
            <>
              {(!users || users.length === 0) ? (
                <div className="relative rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200/50 p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-to-r from-slate-500 to-blue-500 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                        <InfoIcon className="h-12 w-12 text-white relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                      </div>
                      <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-blue-300 rounded-full animate-pulse-ring"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">No users found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">Get started by creating your first user account in the system</p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200/50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
                  <div className="relative z-10 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200/50 hover:bg-gray-50/50">
                          <TableHead className="font-semibold text-gray-700">Name</TableHead>
                          <TableHead className="font-semibold text-gray-700">Email</TableHead>
                          <TableHead className="font-semibold text-gray-700">Role</TableHead>
                          <TableHead className="font-semibold text-gray-700">Status</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers && filteredUsers.length > 0 ? (
                          filteredUsers.map((user, index) => (
                            <TableRow 
                              key={user._id} 
                              className="group border-gray-200/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300"
                              style={{animationDelay: `${index * 0.05}s`}}
                            >
                              <TableCell className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold group-hover:scale-110 transition-transform duration-300">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  {user.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 group-hover:text-gray-800 transition-colors">{user.email}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`capitalize font-medium ${
                                    user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    user.role === 'doctor' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    'bg-green-100 text-green-700 border-green-200'
                                  } group-hover:scale-105 transition-transform duration-200`}
                                >
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`font-medium ${
                                    user.isAdmin ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                                  } group-hover:scale-105 transition-transform duration-200`}
                                >
                                  {user.isAdmin ? "Admin" : "Standard"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                    disabled={user._id === userId}
                                    className="group/edit h-8 px-3 hover:bg-blue-100 hover:text-blue-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <PencilIcon className="h-3 w-3 mr-1 group-hover/edit:rotate-12 transition-transform" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="group/delete h-8 px-3 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleDeleteUser(user)}
                                    disabled={user._id === userId}
                                  >
                                    <TrashIcon className="h-3 w-3 mr-1 group-hover/delete:animate-bounce" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              <div className="text-gray-500 dark:text-gray-400">
                                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No users match your search criteria</p>
                                <p className="text-sm">Try adjusting your search terms</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Fill in all the required fields.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className={formErrors.name ? 'text-red-500' : ''}>
                Name {formErrors.name && `(${formErrors.name})`}
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleInputChange}
                className={formErrors.name ? 'border-red-500' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className={formErrors.email ? 'text-red-500' : ''}>
                Email {formErrors.email && `(${formErrors.email})`}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                className={formErrors.email ? 'border-red-500' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className={formErrors.password ? 'text-red-500' : ''}>
                Password {formErrors.password && `(${formErrors.password})`}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className={formErrors.password ? 'border-red-500' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className={formErrors.role ? 'text-red-500' : ''}>
                Role {formErrors.role && `(${formErrors.role})`}
              </Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  formErrors.role ? 'border-red-500' : ''
                }`}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createUser} disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className={formErrors.name ? 'text-red-500' : ''}>
                Name {formErrors.name && `(${formErrors.name})`}
              </Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleInputChange}
                className={formErrors.name ? 'border-red-500' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email" className={formErrors.email ? 'text-red-500' : ''}>
                Email {formErrors.email && `(${formErrors.email})`}
              </Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                className={formErrors.email ? 'border-red-500' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">
                Password (Leave blank to keep unchanged)
              </Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                placeholder="New password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">
                Role
              </Label>
              <select
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateUser} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <p className="mb-2 text-sm">
                <span className="font-semibold">Name:</span> {selectedUser.name}
              </p>
              <p className="mb-2 text-sm">
                <span className="font-semibold">Email:</span> {selectedUser.email}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Role:</span> {selectedUser.role}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteUser} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
} 