import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();

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
      </div>
    </nav>
  );
}
