import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { session } from "../api";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(session.user());

  function logout() {
    session.clear();
    setUser(null);
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">VideoApp</Link>
      <div className="nav-right">
        <Link to="/profile">Subir video</Link>
        {user ? (
          <>
            <Link to="/profile">{user.name}</Link>
            <button onClick={logout}>Salir</button>
          </>
        ) : (
          <Link to="/auth"><button>Iniciar sesión</button></Link>
        )}
      </div>
    </nav>
  );
}