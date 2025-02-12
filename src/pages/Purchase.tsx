import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Crown, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

export default function Purchase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = searchParams.get('plan');
  const interval = searchParams.get('interval');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/purchase?plan=${plan}&interval=${interval}` } });
    }
    if (!plan || !interval) {
      navigate('/pricing');
    }
  }, [user, plan, interval, navigate]);

const handlePurchase = async () => {
  try {
    const response = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: "supporter",
        interval: "monthly",
      }),
    });

    const data = await response.json();

    console.log("Server Response:", response.status, data); // Debugging log

    if (!response.ok) {
      throw new Error(data.error || "Failed to create checkout session");
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error("No URL returned from Stripe");
    }
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    alert("Failed to start checkout process. Please try again.");
  }
};


  return (
    <>
      <Helmet>
        <title>Complete Purchase - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 text-primary-200 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pricing
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">Complete Your Purchase</h1>
          <p className="text-primary-200">You're just one step away from becoming a Supporter</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
              <Crown className="w-4 h-4 mr-2" />
              Supporter {interval === 'monthly' ? 'Monthly' : 'Yearly'} Plan
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              ${interval === 'monthly' ? '5' : '50'}
              <span className="text-lg text-gray-500">
                /{interval === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            {interval === 'yearly' && (
              <div className="text-sm text-green-600">Save 17% with yearly billing</div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
              {error}
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white py-3 px-6 rounded-md hover:from-yellow-500 hover:to-yellow-600 transition-colors ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Processing...' : 'Proceed to Checkout'}
          </button>

          <p className="mt-4 text-sm text-gray-500 text-center">
            You'll be redirected to Stripe's secure checkout to complete your purchase
          </p>
        </div>
      </div>
    </>
  );
}