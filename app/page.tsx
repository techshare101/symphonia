'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { ArrowRightIcon, SparklesIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-fade-in-up">
          <SparklesIcon className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-slate-300">The Future of DJ Performance</span>
        </div>

        {/* Main Title */}
        <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-6 animate-fade-in-up delay-100">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500">
            SYMPHONIA
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200">
          Transform your library with <span className="text-cyan-400 text-glow-sm">AI-powered analysis</span>,
          multilingual subtitles, and emotion-driven narrative arcs.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up delay-300">
          {user ? (
            <Link href="/tracks" className="btn-primary group">
              <span className="relative z-10 flex items-center gap-2">
                Enter Studio <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ) : (
            <Link href="/login" className="btn-primary group">
              <span className="relative z-10 flex items-center gap-2">
                Start Creating <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          )}

          <button className="btn-secondary flex items-center gap-2">
            <MusicalNoteIcon className="w-5 h-5" />
            <span>Watch Demo</span>
          </button>
        </div>

        {/* Floating Glass Cards (Decorative) */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 perspective-1000">
          {[
            { title: 'Sonic Analysis', desc: 'BPM, Key, Energy extraction', color: 'from-blue-500/20 to-cyan-500/20' },
            { title: 'Narrative Arcs', desc: 'Emotion-based setlist generation', color: 'from-purple-500/20 to-pink-500/20' },
            { title: 'Global Reach', desc: 'Real-time multilingual subtitles', color: 'from-amber-500/20 to-orange-500/20' }
          ].map((card, i) => (
            <div
              key={i}
              className={`chrome-card p-8 text-left transform hover:-translate-y-2 transition-all duration-500 bg-gradient-to-br ${card.color}`}
              style={{ animationDelay: `${400 + (i * 100)}ms` }}
            >
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 border border-white/10">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
              <p className="text-slate-400">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}