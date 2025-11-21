import React, { createContext, useContext, useState, useEffect } from 'react';

export type SubscriptionTier = 'free' | 'trial' | 'basic' | 'pro' | 'premium';
export type BillingPeriod = 'monthly' | 'yearly';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  setSubscription: (tier: SubscriptionTier, billingPeriod: BillingPeriod) => void;
  hasFeatureAccess: (feature: string) => boolean;
  showPricingModal: boolean;
  setShowPricingModal: (show: boolean) => void;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Feature access matrix
const FEATURE_ACCESS = {
  free: [
    'view_interface', // Can see the interface but not use features
  ],
  trial: [
    // Trial has access to ALL premium features for 30 days
    'view_interface',
    'player',
    'music_library',
    'encoder',
    'instant_play',
    'basic_controls',
    'streaming_url',
    'multi_platform_streaming',
    'advanced_effects',
    'unlimited_tracks',
    'custom_branding',
    'white_label',
    'api_access',
    'analytics',
    'custom_domain',
  ],
  basic: [
    'view_interface',
    'player',
    'music_library',
    'encoder',
    'instant_play',
    'basic_controls',
  ],
  pro: [
    'view_interface',
    'player',
    'music_library',
    'encoder',
    'instant_play',
    'basic_controls',
    'streaming_url',
    'multi_platform_streaming',
    'advanced_effects',
    'unlimited_tracks',
    'custom_branding',
  ],
  premium: [
    'view_interface',
    'player',
    'music_library',
    'encoder',
    'instant_play',
    'basic_controls',
    'streaming_url',
    'multi_platform_streaming',
    'advanced_effects',
    'unlimited_tracks',
    'custom_branding',
    'white_label',
    'api_access',
    'analytics',
    'custom_domain',
  ],
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize trial start date on first use
  const initializeTrial = () => {
    const trialStartDate = localStorage.getItem('onestopradio-trial-start');
    if (!trialStartDate) {
      const now = new Date().toISOString();
      localStorage.setItem('onestopradio-trial-start', now);
      localStorage.setItem('onestopradio-subscription-tier', 'trial');
      return 'trial';
    }
    
    // Check if trial is expired
    const startDate = new Date(trialStartDate);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysPassed >= 30) {
      // Trial expired, set to free
      const saved = localStorage.getItem('onestopradio-subscription-tier');
      return saved === 'trial' ? 'free' : (saved as SubscriptionTier);
    }
    
    const saved = localStorage.getItem('onestopradio-subscription-tier');
    return (saved as SubscriptionTier) || 'trial';
  };

  const [tier, setTier] = useState<SubscriptionTier>(initializeTrial);

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(() => {
    const saved = localStorage.getItem('onestopradio-billing-period');
    return (saved as BillingPeriod) || 'monthly';
  });

  const [showPricingModal, setShowPricingModal] = useState(false);

  // Calculate trial expiration
  const getTrialInfo = () => {
    const trialStartDate = localStorage.getItem('onestopradio-trial-start');
    if (!trialStartDate) return { isExpired: false, daysRemaining: 30 };
    
    const startDate = new Date(trialStartDate);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - daysPassed);
    
    return {
      isExpired: daysPassed >= 30,
      daysRemaining
    };
  };

  // Check trial expiration and update tier
  useEffect(() => {
    const checkTrial = () => {
      const info = getTrialInfo();
      
      if (info.isExpired && tier === 'trial') {
        setTier('free');
        setShowPricingModal(true); // Force user to choose a plan
      }
    };
    
    checkTrial();
    const interval = setInterval(checkTrial, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [tier]);

  // Save subscription to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('onestopradio-subscription-tier', tier);
    localStorage.setItem('onestopradio-billing-period', billingPeriod);
  }, [tier, billingPeriod]);

  const setSubscription = (newTier: SubscriptionTier, newBillingPeriod: BillingPeriod) => {
    setTier(newTier);
    setBillingPeriod(newBillingPeriod);
  };

  const hasFeatureAccess = (feature: string): boolean => {
    return FEATURE_ACCESS[tier]?.includes(feature) || false;
  };

  const currentTrialInfo = getTrialInfo();

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        billingPeriod,
        setSubscription,
        hasFeatureAccess,
        showPricingModal,
        setShowPricingModal,
        isTrialExpired: currentTrialInfo.isExpired,
        trialDaysRemaining: currentTrialInfo.daysRemaining,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
