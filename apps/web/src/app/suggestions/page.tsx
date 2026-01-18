"use client";

import { useState, useEffect } from "react";
import type { Suggestion } from "@cuelens/shared";
import Sidebar from "../components/Sidebar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface ApproveModalState {
  suggestion: Suggestion | null;
  displayName: string;
  remindersEnabled: boolean;
}

export default function CaregiverPage() {
  const [pendingSuggestions, setPendingSuggestions] = useState<Suggestion[]>([]);
  const [approvedSuggestions, setApprovedSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<ApproveModalState | null>(null);
  const [frameImages, setFrameImages] = useState<Map<string, string>>(new Map());

  // Fetch suggestions
  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`${API_BASE_URL}/suggestions?status=pending`),
        fetch(`${API_BASE_URL}/suggestions?status=approved`),
      ]);

      if (!pendingRes.ok || !approvedRes.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const pending = await pendingRes.json();
      const approved = await approvedRes.json();

      setPendingSuggestions(pending);
      setApprovedSuggestions(approved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suggestions");
      console.error("Error fetching suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch frame images for suggestions that have frameAssetId
  const fetchFrameImage = async (frameAssetId: string) => {
    if (frameImages.has(frameAssetId)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/frames/${frameAssetId}`);
      if (response.ok) {
        const data = await response.json();
        setFrameImages((prev) => new Map(prev).set(frameAssetId, data.image));
      }
    } catch (err) {
      console.error("Error fetching frame image:", err);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    
    // Auto-refresh suggestions every 3 seconds to show new ones from automatic transcription
    const interval = setInterval(() => {
      fetchSuggestions();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch frame images when suggestions change
  useEffect(() => {
    const allSuggestions = [...pendingSuggestions, ...approvedSuggestions];
    allSuggestions.forEach((s) => {
      if (s.evidence.frameAssetId) {
        fetchFrameImage(s.evidence.frameAssetId);
      }
    });
  }, [pendingSuggestions, approvedSuggestions]);

  // Handle approve click - open modal for identify_person, direct approve for others
  const handleApproveClick = (suggestion: Suggestion) => {
    if (suggestion.type === "identify_person") {
      setApproveModal({
        suggestion,
        displayName: suggestion.proposed.displayName || "",
        remindersEnabled: false,
      });
    } else {
      handleApprove(suggestion.id);
    }
  };

  // Handle approve - either from modal or direct
  const handleApprove = async (id: string, options?: { displayName?: string; remindersEnabled?: boolean }) => {
    try {
      setIsLoading(true);
      setError(null);
      setApproveModal(null);

      const response = await fetch(`${API_BASE_URL}/suggestions/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: options?.displayName,
          remindersEnabled: options?.remindersEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve suggestion");
      }

      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve suggestion");
      console.error("Error approving suggestion:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reject
  const handleReject = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/suggestions/${id}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reject suggestion");
      }

      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject suggestion");
      console.error("Error rejecting suggestion:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background-dark text-white font-display overflow-hidden h-screen flex w-full">
      <Sidebar activePage="suggestions" />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Caregiver Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Review and approve memory suggestions for your loved one
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="glass-panel rounded-xl p-4 border border-red-500/20 bg-red-500/10">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Info message */}
          <div className="glass-panel rounded-xl p-4 border border-primary/20 bg-primary/10">
            <p className="text-primary text-sm">
              Suggestions are automatically created from speech-to-text transcription. Speak names or relationships (e.g., "Hi mom", "This is John") to generate suggestions.
            </p>
          </div>

          {/* Pending suggestions */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Pending Suggestions ({pendingSuggestions.length})
            </h2>
            {pendingSuggestions.length === 0 ? (
              <p className="text-gray-400 text-sm">No pending suggestions</p>
            ) : (
              <div className="space-y-4">
                {pendingSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start gap-4">
                      {/* Frame image if available */}
                      {suggestion.evidence.frameAssetId && frameImages.has(suggestion.evidence.frameAssetId) && (
                        <div className="flex-shrink-0">
                          <img
                            src={frameImages.get(suggestion.evidence.frameAssetId)}
                            alt="Captured frame"
                            className="w-32 h-32 object-cover rounded-lg border border-white/10"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-white font-medium">{suggestion.text}</p>
                          {suggestion.evidence.confidence && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                              {Math.round(suggestion.evidence.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        {suggestion.evidence.transcriptSnippet && (
                          <p className="text-gray-400 text-sm italic mb-2">
                            &quot;{suggestion.evidence.transcriptSnippet}&quot;
                          </p>
                        )}
                        {suggestion.proposed.displayName && (
                          <p className="text-primary text-sm mt-1">
                            Name: {suggestion.proposed.displayName}
                          </p>
                        )}
                        {suggestion.proposed.relationship && (
                          <p className="text-primary text-sm mt-1">
                            Proposed relationship: {suggestion.proposed.relationship}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveClick(suggestion)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(suggestion.id)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved suggestions */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Approved Suggestions ({approvedSuggestions.length})
            </h2>
            {approvedSuggestions.length === 0 ? (
              <p className="text-gray-400 text-sm">No approved suggestions</p>
            ) : (
              <div className="space-y-4">
                {approvedSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-emerald-400 text-sm font-semibold">✓ Approved</span>
                        </div>
                        <p className="text-white font-medium mb-2">{suggestion.text}</p>
                        {suggestion.evidence.transcriptSnippet && (
                          <p className="text-gray-400 text-sm italic">
                            &quot;{suggestion.evidence.transcriptSnippet}&quot;
                          </p>
                        )}
                        {suggestion.proposed.relationship && (
                          <p className="text-primary text-sm mt-1">
                            Relationship: {suggestion.proposed.relationship}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Approve Modal */}
      {approveModal && approveModal.suggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Approve Person</h3>
            
            {approveModal.suggestion.evidence.frameAssetId && frameImages.has(approveModal.suggestion.evidence.frameAssetId) && (
              <div className="mb-4">
                <img
                  src={frameImages.get(approveModal.suggestion.evidence.frameAssetId)}
                  alt="Captured frame"
                  className="w-full h-48 object-cover rounded-lg border border-white/10"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={approveModal.displayName}
                  onChange={(e) =>
                    setApproveModal({ ...approveModal, displayName: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter name"
                />
              </div>

              {approveModal.suggestion.type === "identify_person" && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="remindersEnabled"
                    checked={approveModal.remindersEnabled}
                    onChange={(e) =>
                      setApproveModal({ ...approveModal, remindersEnabled: e.target.checked })
                    }
                    className="size-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                  />
                  <label htmlFor="remindersEnabled" className="text-sm text-gray-300">
                    Enable audio reminders for this person
                  </label>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handleApprove(approveModal.suggestion!.id, {
                      displayName: approveModal.displayName,
                      remindersEnabled: approveModal.remindersEnabled,
                    })
                  }
                  disabled={isLoading || !approveModal.displayName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Approve
                </button>
                <button
                  onClick={() => setApproveModal(null)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}