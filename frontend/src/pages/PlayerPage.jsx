import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, session } from "../api";
import VideoCard from "../components/VideoCard";

export default function PlayerPage() {
  const { id } = useParams();
  const logged = session.isLogged();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api.getVideo(id).then(setVideo).catch((e) => setError(e.message));
    api.getComments(id).then(setComments);
    api.getVideos(`?exclude=${id}&limit=6`).then(setRecommended);
    window.scrollTo(0, 0);
  }, [id]);

  async function sendComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.addComment(id, text);
      setText("");
      setComments(await api.getComments(id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !video) return <p className="error">{error}</p>;
  if (!video) return <p>Cargando...</p>;

  return (
    <div className="player-layout">
      <div className="player-main">
        <video src={video.video_url} controls />
        <h2>{video.title}</h2>
        <p className="small">
          {video.user_name} · {video.views} vistas ·{" "}
          {new Date(video.created_at).toLocaleDateString()}
        </p>
        <p>{video.description}</p>

        <h3>Comentarios ({comments.length})</h3>
        {logged ? (
          <form onSubmit={sendComment} className="comment-form">
            <input
              placeholder="Escribe un comentario"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit">Comentar</button>
          </form>
        ) : (
          <p className="login-hint">
            <Link to="/auth">Inicia sesión</Link> para comentar
          </p>
        )}
        {error && <p className="error">{error}</p>}
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <strong>{c.user_name}</strong>
            <span className="small"> {new Date(c.created_at).toLocaleString()}</span>
            <p>{c.content}</p>
          </div>
        ))}
      </div>

      <div className="player-side">
        <h3>Recomendados</h3>
        {recommended.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}