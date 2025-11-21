import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan?: (tier: 'basic' | 'pro' | 'premium', billingPeriod: 'monthly' | 'yearly') => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ open, onClose, onSelectPlan }) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const pricingTiers = [
    {
      id: 'basic',
      name: 'Basic',
      monthlyPrice: 15,
      yearlyPrice: 150, // 2 months free
      color: '#4CAF50',
      description: 'Perfect for getting started',
      features: [
        'Audio Player Access',
        'Music Library',
        'Encoder for Streaming',
        'Basic Audio Controls',
        'Up to 10 Instant Play Tracks',
      ],
      restrictions: [
        'No Streaming URL',
        'No Advanced Features',
        'No Multi-platform Streaming',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 35,
      yearlyPrice: 350, // 2 months free
      color: '#2196F3',
      description: 'All-in-one solution',
      popular: true,
      features: [
        'Everything in Basic',
        'Streaming URL Generation',
        'Multi-platform Streaming',
        'Advanced Audio Effects',
        'Unlimited Instant Play Tracks',
        'Priority Support',
        'Custom Branding',
      ],
      restrictions: [],
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 55,
      yearlyPrice: 550, // 2 months free
      color: '#FF9800',
      description: 'Complete professional package',
      features: [
        'Everything in Pro',
        'White Label Solution',
        'API Access',
        'Advanced Analytics',
        'Custom Domain Support',
        '24/7 Priority Support',
        'Dedicated Account Manager',
        'Early Access to New Features',
      ],
      restrictions: [],
    },
  ];

  const handleSelectPlan = (tierId: 'basic' | 'pro' | 'premium') => {
    if (onSelectPlan) {
      onSelectPlan(tierId, billingPeriod);
    }
    onClose();
  };

  const getPrice = (tier: typeof pricingTiers[0]) => {
    return billingPeriod === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
  };

  const getSavings = (tier: typeof pricingTiers[0]) => {
    if (billingPeriod === 'yearly') {
      const monthlyCost = tier.monthlyPrice * 12;
      const savings = monthlyCost - tier.yearlyPrice;
      return savings;
    }
    return 0;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: '#fff',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #333', pb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            Choose Your Plan
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Billing Toggle */}
        <Box display="flex" justifyContent="center" alignItems="center" mb={4}>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Monthly
          </Typography>
          <Switch
            checked={billingPeriod === 'yearly'}
            onChange={(e) => setBillingPeriod(e.target.checked ? 'yearly' : 'monthly')}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#4CAF50',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#4CAF50',
              },
            }}
          />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Yearly
          </Typography>
          {billingPeriod === 'yearly' && (
            <Chip
              label="Save 2 Months!"
              color="success"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>

        {/* Pricing Cards */}
        <Box
          display="grid"
          gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }}
          gap={3}
        >
          {pricingTiers.map((tier) => (
            <Card
              key={tier.id}
              sx={{
                bgcolor: '#2a2a2a',
                border: tier.popular ? `2px solid ${tier.color}` : '1px solid #444',
                borderRadius: 2,
                position: 'relative',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${tier.color}40`,
                },
              }}
            >
              {tier.popular && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: tier.color,
                    color: '#fff',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <StarIcon fontSize="small" />
                  <Typography variant="caption" fontWeight="bold">
                    MOST POPULAR
                  </Typography>
                </Box>
              )}

              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={tier.color}
                  gutterBottom
                >
                  {tier.name}
                </Typography>

                <Typography variant="body2" color="#999" mb={2}>
                  {tier.description}
                </Typography>

                <Box mb={3}>
                  <Typography variant="h3" fontWeight="bold" color="#fff">
                    ${getPrice(tier)}
                  </Typography>
                  <Typography variant="body2" color="#999">
                    / {billingPeriod === 'monthly' ? 'month' : 'year'}
                  </Typography>
                  {billingPeriod === 'yearly' && (
                    <Typography variant="caption" color="#4CAF50" mt={1} display="block">
                      Save ${getSavings(tier)} per year
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleSelectPlan(tier.id as any)}
                  sx={{
                    bgcolor: tier.color,
                    color: '#fff',
                    fontWeight: 'bold',
                    mb: 3,
                    '&:hover': {
                      bgcolor: tier.color,
                      opacity: 0.9,
                    },
                  }}
                >
                  Select {tier.name}
                </Button>

                <List dense sx={{ mb: 2 }}>
                  {tier.features.map((feature, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon sx={{ color: tier.color, fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: '#fff',
                        }}
                      />
                    </ListItem>
                  ))}
                </List>

                {tier.restrictions.length > 0 && (
                  <>
                    <Typography variant="caption" color="#999" display="block" mb={1}>
                      Not included:
                    </Typography>
                    <List dense>
                      {tier.restrictions.map((restriction, index) => (
                        <ListItem key={index} disableGutters>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CloseIcon sx={{ color: '#666', fontSize: 16 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={restriction}
                            primaryTypographyProps={{
                              variant: 'caption',
                              color: '#666',
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Additional Info */}
        <Box mt={4} textAlign="center">
          <Typography variant="h6" color="#4CAF50" fontWeight="bold" mb={1}>
            🎉 30-Day Free Trial on All Plans
          </Typography>
          <Typography variant="body2" color="#999">
            Try all premium features free for 30 days. No credit card required. Cancel anytime.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
