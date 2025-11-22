'use client';

import ProcessingMonitor from '@/components/ProcessingMonitor';

export default function MonitorPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Processing Queue</h1>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-400">Analyzing</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-gray-400">Transcribing</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-400">Translating</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-gray-400">Exporting</span>
          </div>
        </div>
      </div>

      <ProcessingMonitor />
    </div>
  );
}