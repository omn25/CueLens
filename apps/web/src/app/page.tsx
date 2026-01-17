export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>CueLens</h1>
      <p style={{ fontSize: "1.25rem", marginBottom: "2rem", color: "#666" }}>
        Base scaffold running
      </p>
      <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <a
          href="/docs/REPO_OVERVIEW.md"
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          Repo Overview
        </a>
        <a
          href="/docs/DEVELOPMENT.md"
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          Development Guide
        </a>
        <a
          href="/docs/ARCHITECTURE.md"
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          Architecture
        </a>
        <a
          href="/docs/ENVIRONMENT.md"
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
        >
          Environment Variables
        </a>
      </nav>
      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.875rem",
          color: "#999",
          maxWidth: "600px",
        }}
      >
        This is a scaffold repository. No features have been implemented yet.
      </p>
    </main>
  );
}
