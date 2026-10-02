import os
import uuid
import datetime as dt
from urllib.parse import urlparse

import boto3
import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

load_dotenv()
from database import Base, engine, get_db
import models

Base.metadata.create_all(bind=engine)

SECRET = os.getenv("JWT_SECRET", "cambiame")
REGION = os.getenv("AWS_REGION", "us-east-1")
VIDEOS_BUCKET = os.getenv("VIDEOS_BUCKET")
THUMBS_BUCKET = os.getenv("THUMBS_BUCKET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

s3 = boto3.client("s3", region_name=REGION)

app = FastAPI(title="Video Platform API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
bearer = HTTPBearer()


class UserIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class VideoUpdate(BaseModel):
    title: str
    description: str = ""


class CommentIn(BaseModel):
    content: str


def create_token(uid: int):
    payload = {
        "sub": str(uid),
        "exp": dt.datetime.utcnow() + dt.timedelta(hours=12),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    try:
        uid = int(jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Token inválido")
    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(401, "Usuario no existe")
    return user


def user_out(u):
    return {"id": u.id, "name": u.name, "email": u.email}


def video_out(v):
    return {
        "id": v.id,
        "title": v.title,
        "description": v.description,
        "video_url": v.video_url,
        "thumbnail_url": v.thumbnail_url,
        "views": v.views,
        "created_at": v.created_at,
        "user_id": v.user_id,
        "user_name": v.user.name,
    }


def upload_to_s3(file: UploadFile, bucket: str, allowed: list):
    if file.content_type not in allowed:
        raise HTTPException(400, f"Tipo no permitido: {file.content_type}")
    ext = os.path.splitext(file.filename)[1].lower()
    key = f"{uuid.uuid4()}{ext}"
    s3.upload_fileobj(
        file.file, bucket, key, ExtraArgs={"ContentType": file.content_type}
    )
    return f"https://{bucket}.s3.{REGION}.amazonaws.com/{key}"


def delete_from_s3(url: str, bucket: str):
    s3.delete_object(Bucket=bucket, Key=urlparse(url).path.lstrip("/"))


@app.post("/users", status_code=201)
def create_user(data: UserIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(400, "El correo ya está registrado")
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    u = models.User(name=data.name, email=data.email, password_hash=hashed)
    db.add(u)
    db.commit()
    db.refresh(u)
    return user_out(u)


@app.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    u = db.query(models.User).filter_by(email=data.email).first()
    if not u or not bcrypt.checkpw(data.password.encode(), u.password_hash.encode()):
        raise HTTPException(401, "Credenciales incorrectas")
    return {"access_token": create_token(u.id), "user": user_out(u)}


@app.get("/users/{id}")
def get_user(id: int, db: Session = Depends(get_db)):
    u = db.get(models.User, id)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    count = db.query(models.Video).filter_by(user_id=id).count()
    return {**user_out(u), "video_count": count}


@app.post("/videos", status_code=201)
def create_video(
    title: str = Form(...),
    description: str = Form(""),
    video: UploadFile = File(...),
    thumbnail: UploadFile = File(...),
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    if video.size and video.size > 100 * 1024 * 1024:
        raise HTTPException(400, "El video supera 100 MB")
    video_url = upload_to_s3(video, VIDEOS_BUCKET, ["video/mp4"])
    thumb_url = upload_to_s3(thumbnail, THUMBS_BUCKET, ["image/jpeg", "image/png"])
    v = models.Video(
        title=title,
        description=description,
        video_url=video_url,
        thumbnail_url=thumb_url,
        user_id=user.id,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return video_out(v)


@app.get("/videos")
def list_videos(
    user_id: int | None = None,
    exclude: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.Video)
    if user_id:
        q = q.filter(models.Video.user_id == user_id)
    if exclude:
        q = q.filter(models.Video.id != exclude)
    videos = q.order_by(models.Video.created_at.desc()).limit(limit).all()
    return [video_out(v) for v in videos]


@app.get("/videos/{id}")
def get_video(id: int, db: Session = Depends(get_db)):
    v = db.get(models.Video, id)
    if not v:
        raise HTTPException(404, "Video no encontrado")
    v.views += 1
    db.commit()
    db.refresh(v)
    return video_out(v)


@app.put("/videos/{id}")
def update_video(
    id: int,
    data: VideoUpdate,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, id)
    if not v:
        raise HTTPException(404, "Video no encontrado")
    if v.user_id != user.id:
        raise HTTPException(403, "No es tu video")
    v.title, v.description = data.title, data.description
    db.commit()
    db.refresh(v)
    return video_out(v)


@app.delete("/videos/{id}")
def delete_video(id: int, user=Depends(current_user), db: Session = Depends(get_db)):
    v = db.get(models.Video, id)
    if not v:
        raise HTTPException(404, "Video no encontrado")
    if v.user_id != user.id:
        raise HTTPException(403, "No es tu video")
    delete_from_s3(v.video_url, VIDEOS_BUCKET)
    delete_from_s3(v.thumbnail_url, THUMBS_BUCKET)
    db.query(models.Comment).filter_by(video_id=id).delete()
    db.delete(v)
    db.commit()
    return {"detail": "Video eliminado"}


@app.post("/videos/{id}/comments", status_code=201)
def add_comment(
    id: int,
    data: CommentIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    if not db.get(models.Video, id):
        raise HTTPException(404, "Video no encontrado")
    c = models.Comment(content=data.content, user_id=user.id, video_id=id)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {
        "id": c.id,
        "content": c.content,
        "created_at": c.created_at,
        "user_name": user.name,
    }


@app.get("/videos/{id}/comments")
def get_comments(id: int, db: Session = Depends(get_db)):
    cs = (
        db.query(models.Comment)
        .filter_by(video_id=id)
        .order_by(models.Comment.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "content": c.content,
            "created_at": c.created_at,
            "user_name": c.user.name,
        }
        for c in cs
    ]