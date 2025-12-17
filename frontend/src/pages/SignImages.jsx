import { useState } from "react";

const ACCESS_KEY = "S__3BHieqX5yFvW_pFWhRhAxI-iAnIRjzJIuLkComGw"; // <-- replace this!

export default function SignImages() {
  const [query, setQuery] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchImage = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setImage(null);

    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          query
        )}&client_id=${ACCESS_KEY}&per_page=1`
      );

      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        setError("No image found for this word.");
      } else {
        // Get the first image URL
        setImage(data.results[0].urls.regular);
      }
    } catch (err) {
      console.error(err);
      setError("Could not reach Unsplash API.");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h1>Image Finder (Unsplash API)</h1>

      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="Search any word..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && searchImage()}
        />

        <button onClick={searchImage} style={styles.button}>
          Search
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {image && (
        <div style={{ marginTop: "20px" }}>
          <img
            src={image}
            alt="search result"
            style={{ maxWidth: "400px", borderRadius: "10px" }}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
  },
  inputRow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  input: {
    padding: "10px",
    width: "300px",
    fontSize: "18px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 20px",
    fontSize: "18px",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
