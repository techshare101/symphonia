'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProcessingStats {
  totalTracks: number;
  completedTracks: number;
  errorTracks: number;
  avgProcessingTime: number;
  processingTimesByStage: Record<string, number>;
  recentErrors: Array<{
    trackId: string;
    error: string;
    timestamp: Timestamp;
  }>;
  hourlyVolume: Array<{
    hour: string;
    count: number;
  }>;
}

async function getHourlyVolume(startDate: Date) {
  const volumeQuery = query(
    collection(db, 'tracks'),
    where('createdAt', '>=', startDate),
    orderBy('createdAt', 'desc')
  );
  const volumeSnap = await getDocs(volumeQuery);

  const hourlyData: Record<string, number> = {};
  volumeSnap.docs.forEach(doc => {
    const timestamp = doc.data().createdAt.toDate();
    const hour = timestamp.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
  });

  return Object.entries(hourlyData).map(([hour, count]) => ({
    hour: hour.slice(11), // Just the hour
    count
  }));
}

export default function AnalyzerStats() {
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const fetchStats = useCallback(async () => {
    try {
      // Calculate time range
      const now = new Date();
      const rangeStart = new Date(now);
      switch (timeRange) {
        case '7d':
          rangeStart.setDate(now.getDate() - 7);
          break;
        case '30d':
          rangeStart.setDate(now.getDate() - 30);
          break;
        default: // 24h
          rangeStart.setDate(now.getDate() - 1);
      }

      const tracksRef = collection(db, 'tracks');
      
      // Get total tracks in range
      const totalQuery = query(
        tracksRef,
        where('createdAt', '>=', rangeStart),
        where('status', '!=', 'error')
      );
      const totalSnap = await getDocs(totalQuery);
      const totalTracks = totalSnap.size;

      // Get completed tracks
      const completedQuery = query(
        tracksRef,
        where('createdAt', '>=', rangeStart),
        where('status', '==', 'ready')
      );
      const completedSnap = await getDocs(completedQuery);
      const completedTracks = completedSnap.size;

      // Get error tracks with details
      const errorQuery = query(
        tracksRef,
        where('createdAt', '>=', rangeStart),
        where('status', '==', 'error'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const errorSnap = await getDocs(errorQuery);
      const errorTracks = errorSnap.size;
      const recentErrors = errorSnap.docs.map(doc => ({
        trackId: doc.id,
        error: doc.data().error,
        timestamp: doc.data().createdAt
      }));

      // Calculate processing times by stage
      const processingTimesByStage: Record<string, number> = {
        analyzing: 0,
        transcribing: 0,
        translating: 0
      };

      completedSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.processingTimes) {
          Object.entries(data.processingTimes).forEach(([stage, time]) => {
            processingTimesByStage[stage] = (processingTimesByStage[stage] || 0) + (time as number);
          });
        }
      });

      // Calculate average processing time
      const totalTime = Object.values(processingTimesByStage).reduce((a, b) => a + b, 0);
      const avgProcessingTime = completedTracks ? totalTime / completedTracks : 0;

      // Get hourly volume data
      const hourlyVolume = await getHourlyVolume(rangeStart);

      setStats({
        totalTracks,
        completedTracks,
        errorTracks,
        avgProcessingTime,
        processingTimesByStage,
        recentErrors,
        hourlyVolume
      });
      setLoading(false);

    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (!mounted) return;

    fetchStats();
  }, [mounted, fetchStats]);

  async function getHourlyVolume(startDate: Date) {
    const volumeQuery = query(
      collection(db, 'tracks'),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );
    const volumeSnap = await getDocs(volumeQuery);

    const hourlyData: Record<string, number> = {};
    volumeSnap.docs.forEach(doc => {
      const timestamp = doc.data().createdAt.toDate();
      const hour = timestamp.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });

    return Object.entries(hourlyData).map(([hour, count]) => ({
      hour: hour.slice(11), // Just the hour
      count
    }));
  }

  if (loading) {
    return (
      <div className="animate-pulse text-center py-12">
        Loading analyzer statistics...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-red-400">
        Error loading statistics
      </div>
    );
  }

  const volumeChartData: ChartData<'line'> = {
    labels: stats.hourlyVolume.map(h => h.hour),
    datasets: [{
      label: 'Tracks Processed',
      data: stats.hourlyVolume.map(h => h.count),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      tension: 0.4
    }]
  };

  const stageTimesChartData: ChartData<'bar'> = {
    labels: Object.keys(stats.processingTimesByStage),
    datasets: [{
      label: 'Average Time (seconds)',
      data: Object.values(stats.processingTimesByStage).map(t => t / stats.completedTracks),
      backgroundColor: [
        'rgba(59, 130, 246, 0.5)', // Blue
        'rgba(139, 92, 246, 0.5)', // Purple
        'rgba(34, 197, 94, 0.5)'   // Green
      ]
    }]
  };

  return (
    <div className="space-y-8">
      {/* Time range selector */}
      <div className="flex justify-end space-x-2">
        {(['24h', '7d', '30d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`
              px-3 py-1 rounded-md text-sm font-medium
              ${timeRange === range
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-300">Processing Rate</h3>
          <p className="text-3xl font-bold mt-2">
            {((stats.completedTracks / stats.totalTracks) * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {stats.completedTracks} of {stats.totalTracks} tracks completed
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-300">Avg Processing Time</h3>
          <p className="text-3xl font-bold mt-2">
            {(stats.avgProcessingTime / 1000).toFixed(1)}s
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Per track across all stages
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-300">Error Rate</h3>
          <p className="text-3xl font-bold mt-2">
            {((stats.errorTracks / stats.totalTracks) * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {stats.errorTracks} errors in {stats.totalTracks} tracks
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Processing Volume</h3>
          <Line
            data={volumeChartData}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: '#9CA3AF' }
                },
                x: {
                  ticks: { color: '#9CA3AF' }
                }
              },
              plugins: {
                legend: {
                  labels: { color: '#9CA3AF' }
                }
              }
            }}
          />
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Processing Time by Stage</h3>
          <Bar
            data={stageTimesChartData}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: '#9CA3AF' }
                },
                x: {
                  ticks: { color: '#9CA3AF' }
                }
              },
              plugins: {
                legend: {
                  labels: { color: '#9CA3AF' }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Recent errors */}
      {stats.recentErrors.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Recent Errors</h3>
          <div className="space-y-4">
            {stats.recentErrors.map((error, i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500 bg-opacity-20">
                    <span className="text-red-400 text-lg">⚠️</span>
                  </span>
                </div>
                <div>
                  <p className="text-sm text-red-400">{error.error}</p>
                  <p className="text-xs text-gray-500 mt-1">
Track: {error.trackId} • <time dateTime={error.timestamp.toDate().toISOString()} suppressHydrationWarning>
                      {mounted ? error.timestamp.toDate().toLocaleString() : ''}
                    </time>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}