'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
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
      console.log('Debug - Not fetching users because:',
        !isAuthenticated ? 'Not authenticated' : 
        !token ? 'No token' : 
        !isAdmin ? 'Not admin' : 'Unknown reason');
      return;
    }
    
    console.log('Debug - Admin status confirmed, fetching users...');
    console.log('Debug - Auth state:', { isAuthenticated, userId, isAdmin });
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
      
      console.log('Debug - Starting fetchUsers() with token:', token ? 'Token exists' : 'No token');
      console.log('Debug - Authorization header:', `Bearer ${token}`);
      
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Debug - API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Debug - API error response:', errorText);
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Debug - Raw API response:', data);
      console.log('Debug - Fetched users count:', data.length ? data.length : 'No length property found');
      console.log('Debug - Fetched users data type:', Array.isArray(data) ? 'Array' : typeof data);
      
      // Make sure we have a valid array of users
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Debug - Non-array response received:', data);
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

  if (!isAuthenticated) {
    return <Loader />;
  }

  if (!isAdmin) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <AlertTriangle className="h-16 w-16 text-yellow-500" />
        <h2 className="mt-6 text-2xl font-bold">Access Denied</h2>
        <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => router.push('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center">
        <ShieldCheckIcon className="mr-3 h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {successMessage && (
        <div className="mb-4 flex items-center rounded-lg bg-green-100 p-4 text-green-700">
          <CheckCircleIcon className="mr-2 h-5 w-5" />
          <span>{successMessage}</span>
          <button 
            className="ml-auto text-green-500 hover:text-green-700"
            onClick={() => setSuccessMessage('')}
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center rounded-lg bg-red-100 p-4 text-red-700">
          <AlertTriangle className="mr-2 h-5 w-5" />
          <span>{error}</span>
          <button 
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-900">User Management</CardTitle>
          <CardDescription className="text-gray-600">
            Manage all users in the system. Create, edit, or delete users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
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
              >
                <UserPlusIcon className="mr-1 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader />
            </div>
          ) : (
            <>
              {(!users || users.length === 0) ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <InfoIcon className="mb-2 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">No users found</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="mt-4"
                  >
                    <UserPlusIcon className="mr-1 h-4 w-4" />
                    Add Your First User
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow key={user._id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  user.role === 'admin' 
                                    ? 'destructive' 
                                    : user.role === 'doctor' 
                                      ? 'default' 
                                      : 'outline'
                                }
                              >
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.isAdmin ? (
                                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                                  Admin
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  Standard
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  disabled={user._id === userId}
                                  title={user._id === userId ? "Can't edit yourself here" : "Edit user"}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={user._id === userId}
                                  title={user._id === userId ? "Can't delete yourself" : "Delete user"}
                                >
                                  <TrashIcon className="h-4 w-4 text-red-500" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No users match your search
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
  );
} 