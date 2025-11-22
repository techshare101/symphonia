'use client';

import AnalyzerStats from '@/components/AnalyzerStats';

export default function StatsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Analyzer Statistics</h1>
          <p className="text-gray-400 mt-1">
            Performance metrics and processing insights
          </p>
        </div>
      </div>

      <AnalyzerStats />
    </div>
  );
}