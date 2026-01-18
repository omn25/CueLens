"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Suggestion } from "@cuelens/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function CaregiverPage() {
  const [pendingSuggestions, setPendingSuggestions] = useState<Suggestion[]>([]);
  const [approvedSuggestions, setApprovedSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch suggestions by status
  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const [pendingResponse, approvedResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/suggestions?status=pending`),
        fetch(`${API_BASE_URL}/suggestions?status=approved`),
      ]);

      // Check if responses are OK
      if (!pendingResponse.ok || !approvedResponse.ok) {
        console.error("API error:", {
          pending: pendingResponse.status,
          approved: approvedResponse.status,
        });
        setPendingSuggestions([]);
        setApprovedSuggestions([]);
        return;
      }

      // Check content-type to ensure we have JSON
      const pendingContentType = pendingResponse.headers.get("content-type");
      const approvedContentType = approvedResponse.headers.get("content-type");

      if (
        !pendingContentType?.includes("application/json") ||
        !approvedContentType?.includes("application/json")
      ) {
        console.error("API returned non-JSON response:", {
          pending: pendingContentType,
          approved: approvedContentType,
        });
        setPendingSuggestions([]);
        setApprovedSuggestions([]);
        return;
      }

      const pendingData = await pendingResponse.json();
      const approvedData = await approvedResponse.json();
      setPendingSuggestions(pendingData || []);
      setApprovedSuggestions(approvedData || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      // Set empty arrays on error to prevent crashes
      setPendingSuggestions([]);
      setApprovedSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Handle transcript submission
  const handleSubmitTranscript = async (e: FormEvent) => {
    e.preventDefault();

    if (!transcript.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcript.trim(),
        }),
      });

      if (response.ok) {
        setTranscript("");
        // Refresh suggestions after creating new ones
        await fetchSuggestions();
      }
    } catch (error) {
      console.error("Error submitting transcript:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle approve suggestion
  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/suggestions/${id}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        // Refresh both pending and approved lists
        await fetchSuggestions();
      }
    } catch (error) {
      console.error("Error approving suggestion:", error);
    }
  };

  // Handle reject suggestion
  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/suggestions/${id}/reject`, {
        method: "POST",
      });

      if (response.ok) {
        // Refresh both pending and approved lists
        await fetchSuggestions();
      }
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
        Caregiver Dashboard
      </h1>

      {/* Transcript Input Form */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Transcript Input
        </h2>
        <form onSubmit={handleSubmitTranscript}>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Enter transcript text here..."
            style={{
              width: "100%",
              minHeight: "150px",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              marginBottom: "1rem",
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={submitting || !transcript.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Processing..." : "Submit Transcript"}
          </button>
        </form>
      </section>

      {/* Pending Suggestions */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Pending Suggestions
        </h2>

        {loading ? (
          <p>Loading suggestions...</p>
        ) : pendingSuggestions.length === 0 ? (
          <p style={{ color: "#666" }}>No pending suggestions</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pendingSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <p style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
                  {suggestion.text}
                </p>

                {suggestion.evidence.transcriptSnippet && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#666",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <strong>Transcript snippet:</strong>
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontStyle: "italic",
                        color: "#888",
                      }}
                    >
                      &ldquo;{suggestion.evidence.transcriptSnippet}&rdquo;
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    onClick={() => handleApprove(suggestion.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(suggestion.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved Suggestions */}
      <section>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Approved Suggestions
        </h2>

        {loading ? (
          <p>Loading suggestions...</p>
        ) : approvedSuggestions.length === 0 ? (
          <p style={{ color: "#666" }}>No approved suggestions</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {approvedSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                style={{
                  border: "1px solid #28a745",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  backgroundColor: "#f0f9f0",
                }}
              >
                <p style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
                  {suggestion.text}
                </p>

                {suggestion.evidence.transcriptSnippet && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#666",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <strong>Transcript snippet:</strong>
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontStyle: "italic",
                        color: "#888",
                      }}
                    >
                      &ldquo;{suggestion.evidence.transcriptSnippet}&rdquo;
                    </p>
                  </div>
                )}

                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#666",
                    marginTop: "0.5rem",
                    fontStyle: "italic",
                  }}
                >
                  Approved {new Date(suggestion.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
