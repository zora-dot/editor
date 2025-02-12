import React from 'react';
import { FileText, HardDrive } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

interface UsageStatsProps {
  dailyPastes: number;
  totalStorage: number;
}

export default function UsageStats({ dailyPastes, totalStorage }: UsageStatsProps) {
  const { isSupporter } = useSubscription();
  
  const maxDailyPastes = isSupporter ? 250 : 50;
  const maxStoragePerPaste = 100 * 1024; // 100KB per paste
  const maxTotalStorage = maxDailyPastes * maxStoragePerPaste; // 5MB for free users, 25MB for supporters

  const dailyPastePercentage = (dailyPastes / maxDailyPastes) * 100;
  const storagePercentage = (totalStorage / maxTotalStorage) * 100;

  return (
    <div className={`grid grid-cols-1 ${isSupporter ? 'md:grid-cols-2' : ''} gap-4`}>
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            <h3 className="font-medium text-gray-900">Daily Pastes</h3>
          </div>
          <span className="text-sm text-gray-500">
            {dailyPastes} / {maxDailyPastes}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${Math.min(dailyPastePercentage, 100)}%` }}
          />
        </div>
      </div>

      {isSupporter && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary-500" />
              <h3 className="font-medium text-gray-900">Storage Used</h3>
            </div>
            <span className="text-sm text-gray-500">
              {(totalStorage / 1024 / 1024).toFixed(2)}MB / {(maxTotalStorage / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}