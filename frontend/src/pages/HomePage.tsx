import React from 'react';
import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Assignment, Assessment, History } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const features = [
    {
      title: 'Take Mock Test',
      description: 'Start a full-length mock test that simulates the actual CIL CBT environment',
      icon: <Assignment fontSize="large" />,
      action: () => navigate('/tests/mock'),
    },
    {
      title: 'Practice Tests',
      description: 'Create custom practice tests by selecting specific sections and topics',
      icon: <Assessment fontSize="large" />,
      action: () => navigate('/tests/practice'),
    },
    {
      title: 'View Results',
      description: 'Check your past test results and track your progress',
      icon: <History fontSize="large" />,
      action: () => navigate('/results'),
    },
  ];

  const adminFeatures = [
    {
      title: 'Manage Questions',
      description: 'Add, edit, or upload questions to the question bank',
      icon: <Assignment fontSize="large" />,
      action: () => navigate('/questions'),
    },
    {
      title: 'Manage Users',
      description: 'View and manage user access to the application',
      icon: <Assessment fontSize="large" />,
      action: () => navigate('/users'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome to CIL CBT Application
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="textSecondary">
        Practice and prepare for your Coal India Limited Computer Based Test
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={feature.action}
              >
                {feature.icon}
                <Typography variant="h6" sx={{ mt: 2 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center">
                  {feature.description}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={feature.action}
                >
                  Get Started
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {isAdmin && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h6" gutterBottom>
            Administrative Tools
          </Typography>
          <Grid container spacing={3}>
            {adminFeatures.map((feature) => (
              <Grid item xs={12} sm={6} key={feature.title}>
                <Paper
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={feature.action}
                >
                  {feature.icon}
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" align="center">
                    {feature.description}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                    onClick={feature.action}
                  >
                    Manage
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};
