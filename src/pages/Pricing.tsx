import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

const features = [
  { 
    name: 'Maximum Daily Posts', 
    free: '50 pastes', 
    supporter: '250 pastes'
  },
  { 
    name: 'Maximum Paste Size', 
    free: '100KB per paste', 
    supporter: '250KB per paste'
  },
  { 
    name: 'Ad-Free Experience', 
    free: false, 
    supporter: true
  },
  { 
    name: 'Custom URLs', 
    free: false, 
    supporter: true
  },
  { 
    name: '"Supporter" Profile Badge', 
    free: false, 
    supporter: true
  },
  { 
    name: 'Customizable Username Style', 
    free: false, 
    supporter: true
  },
  { 
    name: 'Early Access to Features', 
    free: false, 
    supporter: true
  },
  { 
    name: 'Priority Support', 
    free: false, 
    supporter: true
  },
  { 
    name: 'Maximum Paste Expiration', 
    free: '50 days', 
    supporter: 'Unlimited'
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = () => {
    navigate(`/purchase?plan=supporter&interval=${billingInterval}`);
  };

  return (
    <>
      <Helmet>
        <title>Pricing - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-bold text-white">Simple, Transparent Pricing</h1>
          <p className="mt-5 text-xl text-primary-200">Choose the plan that best fits your needs</p>

          <div className="relative mt-6 bg-primary-800/50 rounded-lg p-0.5 flex self-center">
            <button
              type="button"
              className={`relative w-1/2 rounded-md py-2 text-sm font-medium sm:w-auto sm:px-8 ${
                billingInterval === 'monthly' ? 'bg-primary-600 text-white' : 'text-primary-200'
              }`}
              onClick={() => setBillingInterval('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`relative w-1/2 rounded-md py-2 text-sm font-medium sm:w-auto sm:px-8 ${
                billingInterval === 'yearly' ? 'bg-primary-600 text-white' : 'text-primary-200'
              }`}
              onClick={() => setBillingInterval('yearly')}
            >
              Yearly (Save 17%)
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-xl transform transition-transform hover:scale-105 text-center">
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-900">Free</h2>
              <p className="mt-2 text-gray-500">Perfect for getting started</p>
              <p className="mt-8 text-4xl font-bold text-gray-900">$0 <span className="text-gray-500 text-lg">/forever</span></p>
              <Link
                to={user ? '/dashboard' : '/login'}
                className="mt-8 block w-full bg-primary-600 text-white text-center py-3 rounded-md hover:bg-primary-700 transition-colors"
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
              </Link>
            </div>
            <div className="border-t border-gray-100 px-8 py-6">
              <ul className="space-y-4">
                {features.map((feature) => (
                  <li 
                    key={feature.name} 
                    className="flex items-center justify-center"
                  >
                    {typeof feature.free === 'boolean' ? (
                      feature.free ? <Check className="h-6 w-6 text-green-500" /> : <X className="h-6 w-6 text-red-500" />
                    ) : (
                      <span className="h-6 w-6 flex items-center justify-center">
                        <span className="block h-2 w-2 rounded-full bg-gray-400" />
                      </span>
                    )}
                    <span className="ml-3 text-gray-700">
                      {feature.name}
                      {typeof feature.free !== 'boolean' && (
                        <span className="block text-sm text-gray-500 ml-1">
                          {feature.free}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Supporter Plan */}
          <div className="bg-white rounded-2xl shadow-xl transform transition-transform hover:scale-105 text-center relative">
            <div className="absolute -top-5 left-0 right-0 flex justify-center">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                <Crown className="w-4 h-4 mr-1" />
                MOST POPULAR
              </span>
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-900">Supporter</h2>
              <p className="mt-2 text-gray-500">For power users and supporters</p>
              <p className="mt-8 text-4xl font-bold text-gray-900">
                ${billingInterval === 'monthly' ? '5' : '50'}
                <span className="text-gray-500 text-lg">/{billingInterval === 'monthly' ? 'month' : 'year'}</span>
              </p>
              {billingInterval === 'yearly' && (
                <div className="text-sm text-green-600">Save 17% with yearly billing</div>
              )}
              {user ? (
                <button
                  onClick={handleUpgrade}
                  className="mt-8 block w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-center py-3 rounded-md hover:from-yellow-500 hover:to-yellow-600 transition-colors"
                >
                  Upgrade Now
                </button>
              ) : (
                <Link
                  to="/login"
                  className="mt-8 block w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-center py-3 rounded-md hover:from-yellow-500 hover:to-yellow-600 transition-colors"
                >
                  Get Started
                </Link>
              )}
            </div>
            <div className="border-t border-gray-100 px-8 py-6">
              <ul className="space-y-4">
                {features.map((feature) => (
                  <li 
                    key={feature.name} 
                    className="flex items-center justify-center"
                  >
                    {typeof feature.supporter === 'boolean' ? (
                      feature.supporter ? <Check className="h-6 w-6 text-green-500" /> : <X className="h-6 w-6 text-red-500" />
                    ) : (
                      <Check className="h-6 w-6 text-green-500" />
                    )}
                    <span className="ml-3 text-gray-700">
                      {feature.name}
                      {typeof feature.supporter !== 'boolean' && (
                        <span className="block text-sm text-gray-500 ml-1">
                          {feature.supporter}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}