import React from 'react';
import { Crown } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

interface SupporterBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export default function SupporterBadge({ className = '', showLabel = true }: SupporterBadgeProps) {
  const { isSupporter } = useSubscription();

  if (!isSupporter) return null;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full text-sm font-medium ${className}`}>
      <Crown className="w-4 h-4" />
      {showLabel && <span>Supporter</span>}
    </div>
  );
}