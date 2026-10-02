import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, session } from "../api";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await api.register({ name, email, password });
      }
      const data = await api.login({ email, password });
      session.save(data);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-box">
      <h1>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h1>
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">{isRegister ? "Registrarme" : "Entrar"}</button>
      </form>
      <p className="switch" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
      </p>
      <p className="switch">
        <Link to="/">Volver al inicio</Link>
      </p>
    </div>
  );
}