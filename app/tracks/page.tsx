'use client';

import { useState, useEffect } from 'react';
import TrackCard from '@/components/TrackCard';
import { TrackStatus } from '@/components/StatusBadge';
import { MagnifyingGlassIcon, PlusIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/providers/AuthProvider';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createTrackRecord } from '@/firebase/utils';
import { serverTimestamp, updateDoc } from 'firebase/firestore';

interface Track {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  energy?: number;
  duration?: number;
  status: TrackStatus;
  createdAt: any;
}

export default function TracksPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [simulating, setSimulating] = useState(false);
  useEffect(() => {
    const simulate = async () => {
      if (!user || simulating || searchParams.get('simulate') !== 'true') return;

      setSimulating(true);

      try {
        toast.loading('Scanning uploads folder...', { id: 'sim' });

        const response = await fetch('/api/simulate/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid })
        });

        const data = await response.json();

        if (data.success) {
          toast.success(`Found ${data.scanned} files. Imported ${data.results.filter((r: any) => r.status === 'created').length} new tracks.`, { id: 'sim' });
          router.replace('/tracks');
        } else {
          throw new Error(data.error || 'Scan failed');
        }
      } catch (error) {
        console.error('Simulation failed:', error);
        toast.error('Simulation failed', { id: 'sim' });
      } finally {
        setSimulating(false);
      }
    };

    if (user && !loading) {
      simulate();
    }
  }, [user, loading, searchParams, tracks, router, simulating]);

  useEffect(() => {
    if (!user) {
      setTracks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'tracks'),
      where('uploadedBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTracks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        title: doc.data().filename || 'Untitled', // Fallback for now
        status: doc.data().status || 'uploading'
      })) as Track[];

      setTracks(newTracks);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load tracks');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;

    try {
      await deleteDoc(doc(db, 'tracks', id));
      toast.success('Track deleted');
    } catch (error) {
      console.error('Error deleting track:', error);
      toast.error('Failed to delete track');
    }
  };

  const handleRetry = (id: string) => {
    toast.success('Retry requested');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400 text-glow-sm">
              My Tracks
            </span>
          </h1>
          <p className="text-slate-400 text-lg">Manage your sonic library.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 group">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
            <input
              type="text"
              placeholder="Search frequency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12 bg-black/40 border-white/10 focus:border-cyan-500/50"
            />
          </div>

          <Link href="/tracks/upload" className="btn-primary !px-4 !py-3">
            <PlusIcon className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTracks.map(track => (
          <TrackCard
            key={track.id}
            track={track}
            onDelete={handleDelete}
            onRetry={handleRetry}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredTracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative w-48 h-48 mb-8">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-full h-full border border-white/5 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <MusicalNoteIcon className="w-16 h-16 text-slate-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">The Stage is Empty</h3>
          <p className="text-slate-400 mb-8 max-w-md">
            Your library is silent. Upload a track to begin the analysis and unlock the narrative potential.
          </p>
          <Link href="/tracks/upload" className="btn-primary">
            Upload Track
          </Link>
        </div>
      )}
    </div>
  );
}