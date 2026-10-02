import { useEffect, useState } from "react";
import { api, session } from "../api";
import VideoCard from "../components/VideoCard";

export default function ProfilePage() {
  const me = session.user();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    setProfile(await api.getUser(me.id));
    setVideos(await api.getVideos(`?user_id=${me.id}`));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    setMessage("");
    if (!videoFile || !thumbFile) {
      setMessage("Selecciona el video y la miniatura");
      return;
    }
    if (videoFile.size > 100 * 1024 * 1024) {
      setMessage("El video supera 100 MB");
      return;
    }
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("video", videoFile);
    fd.append("thumbnail", thumbFile);
    setUploading(true);
    try {
      await api.uploadVideo(fd);
      setTitle("");
      setDescription("");
      setVideoFile(null);
      setThumbFile(null);
      e.target.reset();
      setMessage("Video publicado");
      await load();
    } catch (err) {
      setMessage(err.message);
    }
    setUploading(false);
  }

  function startEdit(v) {
    setEditId(v.id);
    setEditTitle(v.title);
    setEditDescription(v.description);
  }

  async function saveEdit() {
    try {
      await api.updateVideo(editId, { title: editTitle, description: editDescription });
      setEditId(null);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("¿Eliminar este video?")) return;
    try {
      await api.deleteVideo(id);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (!profile) return <p>Cargando...</p>;

  return (
    <div>
      <div className="profile-header">
        <h2>{profile.name}</h2>
        <p>{profile.email}</p>
        <p>Videos publicados: <strong>{profile.video_count}</strong></p>
      </div>

      <h3>Publicar video</h3>
      <form onSubmit={handleUpload} className="upload-form">
        <input
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label>Video (MP4, máx 100 MB)</label>
        <input
          type="file"
          accept="video/mp4"
          onChange={(e) => setVideoFile(e.target.files[0])}
        />
        <label>Miniatura (JPG o PNG)</label>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => setThumbFile(e.target.files[0])}
        />
        <button type="submit" disabled={uploading}>
          {uploading ? "Subiendo..." : "Publicar"}
        </button>
      </form>
      {message && <p className="message">{message}</p>}

      <h3>Mis videos</h3>
      {videos.length === 0 && <p>No has publicado videos.</p>}
      <div className="grid">
        {videos.map((v) => (
          <div key={v.id} className="my-video">
            <VideoCard video={v} />
            {editId === v.id ? (
              <div className="edit-box">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <button onClick={saveEdit}>Guardar</button>
                <button className="gray" onClick={() => setEditId(null)}>Cancelar</button>
              </div>
            ) : (
              <div className="actions">
                <button onClick={() => startEdit(v)}>Editar</button>
                <button className="red" onClick={() => remove(v.id)}>Eliminar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}