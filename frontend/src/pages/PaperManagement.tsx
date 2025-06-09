import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper as MuiPaper,
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
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { papersAPI } from '../services/api';
import { sectionsAPI, subsectionsAPI } from '../services/api';
import { Loading } from '../components/Loading';
import Pagination from '@mui/material/Pagination';

interface Section {
  section_id?: number;
  section_name: string;
  marks_allocated: number;
  description: string;
  subsections: Subsection[];
}

interface Subsection {
  subsection_id?: number;
  subsection_name: string;
  description: string;
}

interface ExamPaper {
  paper_id: number;
  paper_name: string;
  total_marks: number;
  description: string;
  is_active: boolean;
  sections: Section[];
}

export const PaperManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<{
    paper_name: string;
    total_marks: number;
    description: string;
    sections: Section[];
  }>({
    paper_name: '',
    total_marks: 0,
    description: '',
    sections: [],
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<'paper' | 'section' | 'subsection' | null>(null);
  const [editPaper, setEditPaper] = useState<ExamPaper | null>(null);
  const [editSection, setEditSection] = useState<Section & {paper_id?: number} | null>(null);
  const [editSubsection, setEditSubsection] = useState<Subsection & {section_id?: number, paper_id?: number} | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20); // You can make this user-configurable if desired
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchPapers(page);
  }, [page]);

  const fetchPapers = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await papersAPI.getPapers({ page: pageNum, page_size: pageSize });
      if (response.data.items) {
        setPapers(response.data.items);
        setTotal(response.data.total);
      } else {
        setPapers(response.data);
        setTotal(response.data.length);
      }
      setError(null);
    } catch (err: any) {
      // Enhanced error logging
      console.error('Error fetching papers:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      // Handle authentication errors
      if (err.status === 401 || err.response?.status === 401) {
        setError('Authentication error. Please try logging out and back in.');
        sessionStorage.setItem('redirectAfterLogin', '/manage/papers');
        sessionStorage.setItem('authError', 'Your session has expired. Please log in again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login?session_expired=true';
        }, 1500);
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to load papers');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleCreatePaper = async () => {
    try {
      // Validate required fields before submission
      if (!formData.paper_name || formData.paper_name.trim() === '') {
        setError('Paper name is required');
        return;
      }
      
      if (formData.total_marks <= 0) {
        setError('Total marks must be greater than 0');
        return;
      }
      
      // Log the data being sent to help with debugging
      console.log('Creating paper with data:', JSON.stringify(formData));
      
      await papersAPI.createPaper(formData);
      setOpenDialog(false);
      resetForm();
      fetchPapers();
      setError(null); // Clear any previous errors on success
    } catch (err: any) {
      console.error('Error creating paper:', err);
      setError(err.response?.data?.detail || 'Failed to create paper');
    }
  };

  const handleTogglePaperStatus = async (paperId: number, isActive: boolean) => {
    try {
      if (isActive) {
        await papersAPI.deactivatePaper(paperId);
      } else {
        await papersAPI.activatePaper(paperId);
      }
      fetchPapers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update paper status');
    }
  };

  const handleDeletePaper = async (paperId: number) => {
    if (!window.confirm('Are you sure you want to delete this paper? This action cannot be undone.')) {
      return;
    }
    try {
      await papersAPI.deletePaper(paperId);
      fetchPapers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete paper');
    }
  };

  const resetForm = () => {
    setFormData({
      paper_name: '',
      total_marks: 0,
      description: '',
      sections: [],
    });
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        {
          section_name: '',
          marks_allocated: 0,
          description: '',
          subsections: [],
        },
      ],
    });
  };

  const updateSection = (index: number, field: string, value: any) => {
    const updatedSections = [...formData.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const removeSection = (index: number) => {
    const updatedSections = [...formData.sections];
    updatedSections.splice(index, 1);
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const addSubsection = (sectionIndex: number) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].subsections.push({
      subsection_name: '',
      description: '',
    });
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const updateSubsection = (
    sectionIndex: number,
    subsectionIndex: number,
    field: string,
    value: string
  ) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].subsections[subsectionIndex] = {
      ...updatedSections[sectionIndex].subsections[subsectionIndex],
      [field]: value,
    };
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const removeSubsection = (sectionIndex: number, subsectionIndex: number) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].subsections.splice(subsectionIndex, 1);
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const handleEditPaper = (paper: ExamPaper) => {
    setEditType('paper');
    setEditPaper({...paper});
    setEditDialogOpen(true);
  };
  const handleEditSection = (section: Section, paper: ExamPaper) => {
    setEditType('section');
    setEditSection({...section, paper_id: paper.paper_id});
    setEditDialogOpen(true);
  };
  const handleEditSubsection = (subsection: Subsection, section: Section, paper: ExamPaper) => {
    setEditType('subsection');
    setEditSubsection({...subsection, section_id: section.section_id, paper_id: paper.paper_id});
    setEditDialogOpen(true);
  };
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditType(null);
    setEditPaper(null);
    setEditSection(null);
    setEditSubsection(null);
  };
  const handleEditPaperSave = async () => {
    if (!editPaper) return;
    try {
      await papersAPI.updatePaper(editPaper.paper_id, {
        paper_name: editPaper.paper_name,
        total_marks: editPaper.total_marks,
        description: editPaper.description,
        sections: editPaper.sections
      });
      setEditDialogOpen(false);
      fetchPapers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update paper');
    }
  };
  const handleEditSectionSave = async () => {
    if (!editSection) return;
    try {      await sectionsAPI.updateSection(Number(editSection.section_id), {
        section_name: editSection.section_name,
        marks_allocated: editSection.marks_allocated,
        description: editSection.description
      });
      setEditDialogOpen(false);
      fetchPapers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update section');
    }
  };
  const handleEditSubsectionSave = async () => {
    if (!editSubsection) return;
    try {      await subsectionsAPI.updateSubsection(Number(editSubsection.subsection_id), {
        subsection_name: editSubsection.subsection_name,
        description: editSubsection.description
      });
      setEditDialogOpen(false);
      fetchPapers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update subsection');
    }
  };

  if (loading) {
    return <Loading message="Loading papers..." />;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Paper & Section Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          Add Paper
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {papers.length === 0 ? (
        <Alert severity="info">No papers found. Create your first paper to get started.</Alert>
      ) : (
        papers.map((paper) => (
          <MuiPaper key={paper.paper_id} sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box>
                <Typography variant="h6">{paper.paper_name} <span style={{color:'#888', fontWeight:400}}>(ID: {paper.paper_id})</span></Typography>
              </Box>
              <Box>
                <IconButton
                  color="primary"
                  onClick={() => handleEditPaper(paper)}
                  title="Edit Paper"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color={paper.is_active ? 'success' : 'error'}
                  onClick={() => handleTogglePaperStatus(paper.paper_id, paper.is_active)}
                  title={paper.is_active ? 'Deactivate Paper' : 'Activate Paper'}
                >
                  {paper.is_active ? <ActiveIcon /> : <InactiveIcon />}
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => handleDeletePaper(paper.paper_id)}
                  title="Delete Paper"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 3 }}>
                Total Marks: {paper.total_marks}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 3 }}>
                Sections: {paper.sections.length}
              </Typography>
              <Typography
                variant="body2"
                color={paper.is_active ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 'bold' }}
              >
                {paper.is_active ? 'Active' : 'Inactive'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {paper.description || 'No description provided.'}
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              Sections:
            </Typography>

            {paper.sections.length > 0 ? (
              paper.sections.map((section) => (
                <Accordion key={section.section_id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{section.section_name} <span style={{color:'#888', fontWeight:400}}>(ID: {section.section_id})</span></Typography>
                    <Typography sx={{ ml: 2, color: 'text.secondary' }}>
                      ({section.marks_allocated} marks)
                    </Typography>
                    <IconButton
                      size="small"
                      color="primary"
                      sx={{ ml: 2 }}
                      onClick={e => { e.stopPropagation(); handleEditSection(section, paper); }}
                      title="Edit Section"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {section.description || 'No description provided.'}
                    </Typography>
                    
                    {section.subsections?.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>
                          Subsections:
                        </Typography>
                        <TableContainer component={MuiPaper} variant="outlined" sx={{ mt: 1 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>ID</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {section.subsections.map((subsection) => (
                                <TableRow key={subsection.subsection_id}>
                                  <TableCell>{subsection.subsection_name}</TableCell>
                                  <TableCell>{subsection.description || 'No description'}</TableCell>
                                  <TableCell>{subsection.subsection_id}</TableCell>
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleEditSubsection(subsection, section, paper)}
                                      title="Edit Subsection"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No sections defined for this paper.
              </Typography>
            )}
          </MuiPaper>
        ))
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Paper</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Paper Name"
            value={formData.paper_name}
            onChange={(e) => setFormData({ ...formData, paper_name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Total Marks"
            type="number"
            value={formData.total_marks}
            onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 0 })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
          />

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6">Sections</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addSection}
              sx={{ mt: 1 }}
            >
              Add Section
            </Button>
          </Box>

          {formData.sections.map((section, sectionIndex) => (
            <Box
              key={sectionIndex}
              sx={{
                p: 2,
                border: '1px solid #ddd',
                borderRadius: '4px',
                mb: 2,
                position: 'relative',
              }}
            >
              <IconButton
                size="small"
                color="error"
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => removeSection(sectionIndex)}
              >
                <DeleteIcon />
              </IconButton>
              
              <Typography variant="subtitle1">Section {sectionIndex + 1} {section.section_id ? <span style={{color:'#888', fontWeight:400}}>(ID: {section.section_id})</span> : null}</Typography>
              
              <TextField
                fullWidth
                label="Section Name"
                value={section.section_name}
                onChange={(e) => updateSection(sectionIndex, 'section_name', e.target.value)}
                margin="dense"
                required
              />
              
              <TextField
                fullWidth
                label="Marks Allocated"
                type="number"
                value={section.marks_allocated}
                onChange={(e) => updateSection(sectionIndex, 'marks_allocated', parseInt(e.target.value) || 0)}
                margin="dense"
                required
              />
              
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={section.description}
                onChange={(e) => updateSection(sectionIndex, 'description', e.target.value)}
                margin="dense"
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Subsections</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addSubsection(sectionIndex)}
                  sx={{ mt: 1, mb: 1 }}
                >
                  Add Subsection
                </Button>
                
                {section.subsections.map((subsection, subsectionIndex) => (
                  <Box
                    key={subsectionIndex}
                    sx={{
                      p: 2,
                      bgcolor: 'background.paper', // Use theme background for dark mode support
                      borderRadius: '4px',
                      mb: 1,
                      position: 'relative',
                    }}
                  >
                    <IconButton
                      size="small"
                      color="error"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => removeSubsection(sectionIndex, subsectionIndex)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    
                    <TextField
                      fullWidth
                      label="Subsection Name"
                      value={subsection.subsection_name}
                      onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'subsection_name', e.target.value)}
                      margin="dense"
                      size="small"
                      required
                    />
                    <Typography variant="caption" color="text.secondary">
                      {subsection.subsection_id ? `ID: ${subsection.subsection_id}` : ''}
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Description"
                      value={subsection.description}
                      onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'description', e.target.value)}
                      margin="dense"
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreatePaper}
            disabled={!formData.paper_name || formData.total_marks <= 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog - place at the bottom of the main component */}
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit {editType === 'paper' ? 'Paper' : editType === 'section' ? 'Section' : 'Subsection'}</DialogTitle>
        <DialogContent dividers>
          {editType === 'paper' && editPaper && (
            <>
              <TextField
                fullWidth
                label="Paper Name"
                value={editPaper.paper_name}
                onChange={e => setEditPaper({...editPaper, paper_name: e.target.value})}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Total Marks"
                type="number"
                value={editPaper.total_marks}
                onChange={e => setEditPaper({...editPaper, total_marks: parseInt(e.target.value) || 0})}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={editPaper.description}
                onChange={e => setEditPaper({...editPaper, description: e.target.value})}
                margin="normal"
              />
            </>
          )}
          {editType === 'section' && editSection && (
            <>
              <TextField
                fullWidth
                label="Section Name"
                value={editSection.section_name}
                onChange={e => setEditSection({...editSection, section_name: e.target.value})}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Marks Allocated"
                type="number"
                value={editSection.marks_allocated}
                onChange={e => setEditSection({...editSection, marks_allocated: parseInt(e.target.value) || 0})}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={editSection.description}
                onChange={e => setEditSection({...editSection, description: e.target.value})}
                margin="normal"
              />
            </>
          )}
          {editType === 'subsection' && editSubsection && (
            <>
              <TextField
                fullWidth
                label="Subsection Name"
                value={editSubsection.subsection_name}
                onChange={e => setEditSubsection({...editSubsection, subsection_name: e.target.value})}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={editSubsection.description}
                onChange={e => setEditSubsection({...editSubsection, description: e.target.value})}
                margin="normal"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          {editType === 'paper' && <Button variant="contained" onClick={handleEditPaperSave}>Save</Button>}
          {editType === 'section' && <Button variant="contained" onClick={handleEditSectionSave}>Save</Button>}
          {editType === 'subsection' && <Button variant="contained" onClick={handleEditSubsectionSave}>Save</Button>}
        </DialogActions>
      </Dialog>

      <TableContainer component={MuiPaper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Paper Name</TableCell>
              <TableCell>Total Marks</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {papers.map((paper) => (
              <TableRow key={paper.paper_id}>
                <TableCell>{paper.paper_name}</TableCell>
                <TableCell>{paper.total_marks}</TableCell>
                <TableCell>{paper.description || 'No description'}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color={paper.is_active ? 'success.main' : 'error.main'}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {paper.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleEditPaper(paper)}
                    title="Edit Paper"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color={paper.is_active ? 'success' : 'error'}
                    onClick={() => handleTogglePaperStatus(paper.paper_id, paper.is_active)}
                    title={paper.is_active ? 'Deactivate Paper' : 'Activate Paper'}
                  >
                    {paper.is_active ? <ActiveIcon /> : <InactiveIcon />}
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeletePaper(paper.paper_id)}
                    title="Delete Paper"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={Math.ceil(total / pageSize)}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>
    </Box>
  );
}
