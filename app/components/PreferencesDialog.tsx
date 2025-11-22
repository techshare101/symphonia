'use client';

import { useState, useEffect } from 'react';
import { usePreferences, UserPreferences } from '@/hooks/usePreferences';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';

interface PreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PreferencesDialog({ isOpen, onClose }: PreferencesDialogProps) {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [localPrefs, setLocalPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize localPrefs after first render to prevent hydration mismatch
  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  // Don't render until we have local preferences
  if (!localPrefs) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(localPrefs);
      toast.success('Preferences saved');
      onClose();
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetPreferences();
      setLocalPrefs(preferences);
      toast.success('Preferences reset to defaults');
    } catch (error) {
      toast.error('Failed to reset preferences');
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6">
            <Dialog.Title className="text-lg font-medium mb-4">
              Preferences
            </Dialog.Title>

            <div className="space-y-6">
              {/* Theme selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  value={localPrefs.theme}
                  onChange={(e) => setLocalPrefs({
                    ...localPrefs,
                    theme: e.target.value as UserPreferences['theme']
                  })}
                  className="w-full bg-gray-700 border-gray-600 rounded-md"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>

              {/* Default arc template */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Arc Template
                </label>
                <input
                  type="text"
                  value={localPrefs.defaultArc}
                  onChange={(e) => setLocalPrefs({
                    ...localPrefs,
                    defaultArc: e.target.value
                  })}
                  className="w-full bg-gray-700 border-gray-600 rounded-md"
                />
              </div>

              {/* Upload settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Upload Settings
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Max File Size (MB)
                    </label>
                    <input
                      type="number"
                      value={localPrefs.uploadSettings.maxSize / (1024 * 1024)}
                      onChange={(e) => setLocalPrefs({
                        ...localPrefs,
                        uploadSettings: {
                          ...localPrefs.uploadSettings,
                          maxSize: Number(e.target.value) * 1024 * 1024
                        }
                      })}
                      className="w-full bg-gray-700 border-gray-600 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={localPrefs.uploadSettings.autoProcess}
                        onChange={(e) => setLocalPrefs({
                          ...localPrefs,
                          uploadSettings: {
                            ...localPrefs.uploadSettings,
                            autoProcess: e.target.checked
                          }
                        })}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <span className="text-sm text-gray-400">
                        Auto-process uploads
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      value={localPrefs.uploadSettings.retryAttempts}
                      onChange={(e) => setLocalPrefs({
                        ...localPrefs,
                        uploadSettings: {
                          ...localPrefs.uploadSettings,
                          retryAttempts: Number(e.target.value)
                        }
                      })}
                      min={1}
                      max={5}
                      className="w-full bg-gray-700 border-gray-600 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Reset to Defaults
              </button>

              <div className="space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`
                    px-4 py-2 text-sm font-medium text-white rounded-md
                    bg-blue-600 hover:bg-blue-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}