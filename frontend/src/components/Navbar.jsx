import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Check if user is logged in
    const username = localStorage.getItem("username");
    const name = localStorage.getItem("name");
    setIsLoggedIn(!!username);
    setUserName(name || username || "");
  }, [location]); // Re-check on route change

  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="nav-brand">
          NutriLens
        </Link>
      </div>

      <div className="nav-right">
        <Link
          to="/"
          className={
            "nav-link" + (location.pathname === "/" ? " active" : "")
          }
        >
          Home
        </Link>
        
        {isLoggedIn ? (
          <>
            <Link
              to="/profile"
              className={
                "nav-link" + (location.pathname === "/profile" ? " active" : "")
              }
            >
              <span className="profile-icon">👤</span> {userName || "Profile"}
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/signin"
              className={
                "nav-link" + (location.pathname === "/signin" ? " active" : "")
              }
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className={
                "nav-link" + (location.pathname === "/signup" ? " active" : "")
              }
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

// Made with Bob
