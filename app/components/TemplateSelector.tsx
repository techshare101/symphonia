'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Template {
    name: string;
    description: string;
    stages: string[];
    stage_descriptions: Record<string, string>;
    bpm_range: Record<string, [number, number]>;
}

interface TemplateSelectorProps {
    templates: Record<string, Template>;
    onSelect: (templateId: string) => void;
}

export function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">
                    Loading templates...
                </h2>
            </div>
        );
    }

    const handleSelect = (id: string) => {
        setSelectedId(id);
        onSelect(id);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
                Select Arc Template
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(templates).map(([id, template]) => (
                    <div
                        key={id}
                        className={`
                            relative p-4 rounded-lg border-2 cursor-pointer
                            ${selectedId === id
                                ? 'border-blue-500 bg-slate-800'
                                : 'border-slate-600 bg-slate-900 hover:border-slate-400'
                            }
                        `}
                        onClick={() => handleSelect(id)}
                    >
                        <h3 className="font-medium mb-2">
                            {template.name}
                        </h3>
                        <p className="text-sm text-slate-400 mb-3">
                            {template.description}
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                {template.stages.length} stages
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDetails(id);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Template details modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold">
                                    {templates[showDetails].name}
                                </h3>
                                <button
                                    onClick={() => setShowDetails(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-slate-300 mb-6">
                                {templates[showDetails].description}
                            </p>

                            <div className="space-y-6">
                                {templates[showDetails].stages.map((stage, i) => (
                                    <div key={stage} className="space-y-2">
                                        <h4 className="font-medium">
                                            {i + 1}. {stage}
                                        </h4>
                                        <p className="text-sm text-slate-400">
                                            {templates[showDetails].stage_descriptions[stage]}
                                        </p>
                                        <div className="text-xs text-slate-500">
BPM: <span suppressHydrationWarning>
                                                {mounted ? templates[showDetails].bpm_range[stage].join(' - ') : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-800 p-4 flex justify-end">
                            <button
                                onClick={() => {
                                    handleSelect(showDetails);
                                    setShowDetails(null);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                            >
                                Use This Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}