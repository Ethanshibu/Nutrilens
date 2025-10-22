import { useState } from "react";
import "./signin.css"; // we'll create this file next

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Signing in...");

    try {
      const response = await fetch("http://localhost:8000/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Signin failed");
      }

      setMessage(data.message); // e.g. “Welcome back, Sanjay!”
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Sign In</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign In</button>
        </form>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}
