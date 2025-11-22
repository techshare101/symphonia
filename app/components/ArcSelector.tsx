'use client';

import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

const arcs = [
    { id: 'heartbreak', name: 'Heartbreak → Healing', description: 'Starts with melancholy, moves to acceptance, ends in joy.' },
    { id: 'rising', name: 'The Rising Tide', description: 'Steady build-up of energy from start to finish.' },
    { id: 'euphoria', name: 'Peak Euphoria', description: 'High energy bangers maintained throughout.' },
    { id: 'custom', name: 'Custom Arc', description: 'Define your own emotional journey.' },
];

interface ArcSelectorProps {
    selected: string;
    onChange: (value: string) => void;
}

export default function ArcSelector({ selected, onChange }: ArcSelectorProps) {
    const selectedArc = arcs.find(a => a.id === selected) || arcs[0];

    return (
        <div className="w-full">
            <Listbox value={selected} onChange={onChange}>
                <div className="relative mt-1">
                    <Listbox.Button className="relative w-full cursor-default rounded-xl bg-black/40 py-4 pl-4 pr-10 text-left border border-white/10 backdrop-blur-md shadow-lg transition-all hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:outline-none focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30">
                        <span className="block truncate font-bold text-white tracking-wide">{selectedArc.name}</span>
                        <span className="block truncate text-xs text-cyan-400/80 font-mono mt-1">{selectedArc.description}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                            <ChevronUpDownIcon
                                className="h-5 w-5 text-cyan-500"
                                aria-hidden="true"
                            />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-xl bg-[#0a0118]/95 border border-cyan-500/30 py-1 text-base shadow-2xl shadow-cyan-900/20 ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 backdrop-blur-xl">
                            {arcs.map((arc, arcIdx) => (
                                <Listbox.Option
                                    key={arcIdx}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-3 pl-10 pr-4 transition-colors ${active ? 'bg-cyan-900/30 text-cyan-100' : 'text-slate-300'
                                        }`
                                    }
                                    value={arc.id}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span
                                                className={`block truncate ${selected ? 'font-bold text-cyan-400' : 'font-normal'
                                                    }`}
                                            >
                                                {arc.name}
                                            </span>
                                            <span className={`block truncate text-xs font-mono mt-0.5 ${selected ? 'text-cyan-300/70' : 'text-slate-500'}`}>
                                                {arc.description}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-400">
                                                    <CheckIcon className="h-5 w-5 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
}
