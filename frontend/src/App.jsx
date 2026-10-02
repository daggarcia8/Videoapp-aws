import { Routes, Route, Navigate } from "react-router-dom";
import { session } from "./api";
import Navbar from "./components/Navbar";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import PlayerPage from "./pages/PlayerPage";
import ProfilePage from "./pages/ProfilePage";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container">{children}</main>
    </>
  );
}

function Private({ children }) {
  if (!session.isLogged()) return <Navigate to="/auth" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/video/:id" element={<Layout><PlayerPage /></Layout>} />
      <Route
        path="/profile"
        element={<Private><Layout><ProfilePage /></Layout></Private>}
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}