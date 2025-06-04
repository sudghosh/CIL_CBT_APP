import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,  Alert,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { authAPI } from '../services/api';
import { Loading } from '../components/Loading';

interface User {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
}

interface AllowedEmail {
  allowed_email_id: number;
  email: string;
  added_by_admin_id: number;
  added_at: string;
}

export const UserManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [emailToAdd, setEmailToAdd] = useState('');
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<AllowedEmail | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loadingEmails, setLoadingEmails] = useState(true);  useEffect(() => {
    fetchUsers();
    fetchAllowedEmails();
    
    // Add event listener for auth status changes
    window.addEventListener('auth-status-changed', fetchUsers);
    
    // Clean up
    return () => {
      window.removeEventListener('auth-status-changed', fetchUsers);
    };
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Check if token exists
      const token = localStorage.getItem('token');
      console.log('Token when fetching users:', token ? 'Token exists' : 'No token');
      
      if (!token) {
        setError('You must be logged in to access this page.');
        setLoading(false);
        return;
      }
      
      const response = await authAPI.getUsers();
      setUsers(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      
      // Handle unauthorized errors
      if (err.status === 401 || err.response?.status === 401) {
        setError('Authentication error. Please try logging out and back in.');
        
        // Save current URL to return after login
        sessionStorage.setItem('redirectAfterLogin', '/manage/users');
        
        // Store error message in sessionStorage to display after redirect
        sessionStorage.setItem('authError', 'Your session has expired. Please log in again.');
        
        // Redirect to login page after a short delay to allow error message to be seen
        setTimeout(() => {
          console.log('[DEBUG][HardRedirect][UserManagement] Redirecting to /login?session_expired=true');
          localStorage.removeItem('token');
          window.location.href = '/login?session_expired=true';
        }, 1500);
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };
  const fetchAllowedEmails = async () => {
    try {
      setLoadingEmails(true);
      const response = await authAPI.getAllowedEmails();
      setAllowedEmails(response.data);
    } catch (err: any) {
      console.error('Error fetching allowed emails:', err);
      setError(err.response?.data?.detail || 'Failed to load whitelisted emails');
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleWhitelistEmail = async () => {
    try {
      await authAPI.whitelistEmail(emailToAdd);
      setOpenDialog(false);
      setEmailToAdd('');
      setError(null);
      // Refresh the list of allowed emails
      fetchAllowedEmails();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to whitelist email');
    }
  };
  
  const handleDeleteAllowedEmail = async () => {
    if (!emailToDelete) return;
    
    try {
      await authAPI.deleteAllowedEmail(emailToDelete.allowed_email_id);
      setDeleteConfirmDialog(false);
      setEmailToDelete(null);
      fetchAllowedEmails();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete whitelisted email');
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await authAPI.updateUserStatus(userId, !currentStatus);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user status');
    }
  };
  const handleToggleUserRole = async (userId: number, currentRole: string) => {
    try {
      const newRole = currentRole === 'Admin' ? 'User' : 'Admin';
      await authAPI.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user role');
    }
  };

  if (loading) {
    return <Loading message="Loading users..." />;
  }
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Whitelist Email
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Users" id="tab-0" />
          <Tab label="Whitelisted Emails" id="tab-1" />
        </Tabs>
      </Box>
      
      {activeTab === 0 && (
        <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : 'N/A'}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.is_active}
                    onChange={() => handleToggleUserStatus(user.user_id, user.is_active)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleToggleUserRole(user.user_id, user.role)}
                  >
                    {user.role === 'Admin' ? 'Make Regular User' : 'Make Admin'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>      </TableContainer>
      )}
      
      {activeTab === 1 && (
        <>
          {loadingEmails ? (
            <Loading message="Loading whitelisted emails..." />
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Added At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allowedEmails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">No whitelisted emails found</TableCell>
                    </TableRow>
                  ) : (
                    allowedEmails.map((email) => (
                      <TableRow key={email.allowed_email_id}>
                        <TableCell>{email.email}</TableCell>
                        <TableCell>{new Date(email.added_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Tooltip title="Delete email">
                            <IconButton 
                              color="error"
                              onClick={() => {
                                setEmailToDelete(email);
                                setDeleteConfirmDialog(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Add Email Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Whitelist New Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={emailToAdd}
            onChange={(e) => setEmailToAdd(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleWhitelistEmail} variant="contained">
            Whitelist
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog} onClose={() => setDeleteConfirmDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {emailToDelete?.email} from the whitelist?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteAllowedEmail} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
