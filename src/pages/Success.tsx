import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { Helmet } from 'react-helmet-async';

export default function Success() {
  const navigate = useNavigate();
  const { checkSubscriptionStatus } = useSubscription();

  useEffect(() => {
    const initializeSubscription = async () => {
      await checkSubscriptionStatus();
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    };

    initializeSubscription();
  }, [checkSubscriptionStatus, navigate]);

  return (
    <>
      <Helmet>
        <title>Payment Successful - PasteBin Rich Text</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            
            <div className="flex items-center justify-center gap-2 text-primary-600 mb-4">
              <Crown className="w-5 h-5" />
              <span className="font-medium">Welcome to Supporter Status</span>
            </div>
            
            <p className="text-gray-600 mb-6">
              Your account has been upgraded successfully. You now have access to all supporter features!
            </p>
            
            <div className="animate-pulse text-sm text-gray-500">
              Redirecting to dashboard...
            </div>
          </div>
        </div>
      </div>
    </>
  );
}