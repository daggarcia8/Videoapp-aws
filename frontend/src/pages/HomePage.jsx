import { useEffect, useState } from "react";
import { api } from "../api";
import VideoCard from "../components/VideoCard";

export default function HomePage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getVideos()
      .then(setVideos)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h2>Videos</h2>
      {videos.length === 0 && <p>Aún no hay videos publicados.</p>}
      <div className="grid">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}