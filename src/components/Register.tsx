import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as RegisterIcon
} from '@mui/icons-material';
import { authService } from '../services/AuthService';

interface RegisterProps {
  open: boolean;
  onClose: () => void;
  onRegister: (userData: any) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ open, onClose, onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    djName: '',
    genre: '',
    streamTitle: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const genres = [
    'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical', 
    'Reggae', 'Country', 'R&B', 'Techno', 'House', 'Trance',
    'Dubstep', 'Ambient', 'Folk', 'Indie', 'Alternative', 'Other'
  ];

  const handleChange = (field: string) => (e: any) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const result = await authService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        djName: formData.djName,
        genre: formData.genre,
        streamTitle: formData.streamTitle
      });

      if (result) {
        onRegister(result.user);
        onClose();
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
            Create Account
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="First Name"
              fullWidth
              margin="normal"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiOutlinedInput-input': { color: 'white' }
              }}
            />

            <TextField
              label="Last Name"
              fullWidth
              margin="normal"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiOutlinedInput-input': { color: 'white' }
              }}
            />
          </Box>

          <TextField
            label="Email Address"
            type="email"
            fullWidth
            margin="normal"
            value={formData.email}
            onChange={handleChange('email')}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiOutlinedInput-input': { color: 'white' }
            }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={formData.password}
              onChange={handleChange('password')}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiOutlinedInput-input': { color: 'white' }
              }}
            />

            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiOutlinedInput-input': { color: 'white' }
              }}
            />
          </Box>

          <Typography variant="h6" sx={{ color: 'white', mt: 3, mb: 2, fontWeight: 600 }}>
            🎵 Streaming Setup
          </Typography>

          <TextField
            label="DJ/Artist Name"
            fullWidth
            margin="normal"
            value={formData.djName}
            onChange={handleChange('djName')}
            helperText="This will be displayed on your stream"
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiOutlinedInput-input': { color: 'white' },
              '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' }
            }}
          />

          <TextField
            label="Stream Title"
            fullWidth
            margin="normal"
            value={formData.streamTitle}
            onChange={handleChange('streamTitle')}
            helperText="e.g., 'Friday Night Mix', 'Electronic Vibes'"
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#00D4FF' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiOutlinedInput-input': { color: 'white' },
              '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' }
            }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Music Genre</InputLabel>
            <Select
              value={formData.genre}
              onChange={handleChange('genre')}
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00D4FF' }
              }}
            >
              {genres.map((genre) => (
                <MenuItem key={genre} value={genre}>{genre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RegisterIcon />}
            sx={{
              mt: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #00D4FF 0%, #5928E6 100%)',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account & Setup Stream'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Already have an account?{' '}
              <Button
                onClick={onSwitchToLogin}
                sx={{ 
                  color: '#00D4FF', 
                  textTransform: 'none',
                  fontWeight: 600,
                  p: 0,
                  minWidth: 'auto'
                }}
              >
                Login here
              </Button>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default Register;