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
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { authService } from '../services/AuthService';

interface LoginProps {
  open: boolean;
  onClose: () => void;
  onLogin: (userData: any) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ open, onClose, onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.login(email, password);
      
      if (result) {
        if (result.message) {
          // Trial expired message
          setError(result.message);
        } else {
          onLogin(result.user);
          onClose();
        }
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
            Login
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
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
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
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Don't have an account?{' '}
              <Button
                onClick={onSwitchToRegister}
                sx={{ 
                  color: '#00D4FF', 
                  textTransform: 'none',
                  fontWeight: 600,
                  p: 0,
                  minWidth: 'auto'
                }}
              >
                Register here
              </Button>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default Login;