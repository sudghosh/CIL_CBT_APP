import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  SelectChangeEvent,
  Alert
} from "@mui/material";
import { Add, Edit, Delete, Refresh } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ApiKey, ApiKeyForm, API_KEY_TYPES } from "../types/apiKey";
import { api } from "../services/api";

async function fetchApiKeys(
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string>>
) {
  setLoading(true);
  setError(""); // Clear any previous errors
  
  try {
    const response = await api.get('/admin/api-keys');
    
    // Ensure data is an array or extract array from response
    let processedApiKeys: ApiKey[] = [];
    
    if (Array.isArray(response.data)) {
      processedApiKeys = response.data;
    } else if (response.data && Array.isArray(response.data.api_keys)) {
      processedApiKeys = response.data.api_keys;
    } else {
      console.warn('Unexpected API response format:', response.data);
      processedApiKeys = [];
      setError('Unexpected response format from server');
    }
    
    // Final safety check
    setApiKeys(Array.isArray(processedApiKeys) ? processedApiKeys : []);
  } catch (error: any) {
    console.error('API Keys fetch error:', error);
    setApiKeys([]); // Ensure apiKeys is always an array
    
    if (error.response?.status === 401) {
      setError('Authentication failed. Please log in again and try refreshing the page.');
    } else if (error.response?.status === 403) {
      setError('You do not have permission to access API keys. Admin access required.');
    } else {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch API keys';
      setError(errorMessage);
    }
  } finally {
    setLoading(false);
  }
}

export default function ApiKeyAdminPage() {
  const { user, isAdmin, loading: authLoading, authChecked } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [form, setForm] = useState<ApiKeyForm>({ key_type: "google", key: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  // Ensure apiKeys is always an array for safety
  const safeApiKeys = Array.isArray(apiKeys) ? apiKeys : [];

  useEffect(() => {
    // Only fetch API keys if user is authenticated and is admin
    if (user && isAdmin && authChecked) {
      fetchApiKeys(setApiKeys, setLoading, setError);
    }
  }, [user, isAdmin, authChecked]);

  // Check authentication and admin status
  if (authLoading || !authChecked) {
    return (
      <Box p={3}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You must be logged in to access this page. Please log in and try again.
        </Alert>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You do not have permission to access this page. Admin access is required.
        </Alert>
      </Box>
    );
  }

  const handleOpenDialog = (key: ApiKey | null = null) => {
    setEditKey(key);
    setForm(
      key
        ? { key_type: key.key_type, key: "", description: key.description || "" }
        : { key_type: "google", key: "", description: "" }
    );
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditKey(null);
    setForm({ key_type: "google", key: "", description: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const name = e.target.name as keyof ApiKeyForm;
    setForm({ ...form, [name]: e.target.value as string });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    
    try {
      const body = editKey
        ? { ...form, key: form.key || undefined, description: form.description }
        : form;
      
      if (editKey) {
        await api.put(`/admin/api-keys/${editKey.id}`, body);
      } else {
        await api.post('/admin/api-keys', body);
      }
      
      fetchApiKeys(setApiKeys, setLoading, setError);
      handleCloseDialog();
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to manage API keys.');
      } else {
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to save API key';
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this API key?")) return;
    
    setSubmitting(true);
    setError("");
    try {
      await api.delete(`/admin/api-keys/${id}`);
      fetchApiKeys(setApiKeys, setLoading, setError);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to delete API keys.');
      } else {
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete API key';
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        API Key Management
      </Typography>
      <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => handleOpenDialog()}>
        Add API Key
      </Button>
      <IconButton onClick={() => fetchApiKeys(setApiKeys, setLoading, setError)} title="Refresh" sx={{ ml: 1 }}>
        <Refresh />
      </IconButton>
      {loading ? (
        <Box mt={2}><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error" mt={2}>{error}</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {safeApiKeys.length > 0 ? safeApiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.key_type}</TableCell>
                  <TableCell>{key.description}</TableCell>
                  <TableCell>{key.created_by_admin_id}</TableCell>
                  <TableCell>{key.created_at}</TableCell>
                  <TableCell>{key.updated_at}</TableCell>
                  <TableCell>
                    <Tooltip title={submitting ? "Please wait..." : "Edit"}>
                      <span>
                        <IconButton onClick={() => handleOpenDialog(key)} disabled={submitting}>
                          <Edit />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={submitting ? "Please wait..." : "Delete"}>
                      <span>
                        <IconButton onClick={() => handleDelete(key.id)} disabled={submitting}>
                          <Delete />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No API keys found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{editKey ? "Edit API Key" : "Add API Key"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                name="key_type"
                value={form.key_type}
                label="Type"
                onChange={handleChange}
                disabled={!!editKey}
              >
                {API_KEY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="key"
              label="API Key"
              value={form.key}
              onChange={handleChange}
              fullWidth
              margin="normal"
              type="password"
              required={!editKey}
              helperText={editKey ? "Leave blank to keep existing key" : ""}
            />
            <TextField
              name="description"
              label="Description"
              value={form.description}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
            {error && <Typography color="error" mt={1}>{error}</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : editKey ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
