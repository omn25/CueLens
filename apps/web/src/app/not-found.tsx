export default function NotFound() {
  return (
    <div
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
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>404</h1>
      <p style={{ fontSize: "1.125rem", color: "#666" }}>Page not found</p>
      <a
        href="/"
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          border: "1px solid #333",
          borderRadius: "4px",
          display: "inline-block",
        }}
      >
        Go home
      </a>
    </div>
  );
}
