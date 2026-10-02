import { Link } from "react-router-dom";

export default function VideoCard({ video }) {
  const date = new Date(video.created_at).toLocaleDateString();

  return (
    <Link to={`/video/${video.id}`} className="card">
      <img src={video.thumbnail_url} alt={video.title} />
      <h3>{video.title}</h3>
      <p>{video.user_name}</p>
      <p className="small">{video.views} vistas · {date}</p>
    </Link>
  );
}