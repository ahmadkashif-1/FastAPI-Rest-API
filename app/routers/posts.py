from fastapi import FastAPI, status, HTTPException, Response, Depends, APIRouter
from typing import List
from .. import models, schema, oauth2
from ..database import get_db
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)

@router.get("/", response_model=List[schema.Post])
def get_post(db: Session = Depends(get_db)):
    posts = db.query(models.Post).all()
    return  posts

@router.get("/latest", response_model=schema.Post)
def latest_post(db: Session = Depends(get_db)):
    # cursor.execute("""SELECT * FROM posts ORDER BY id DESC LIMIT 1""")
    # latest = cursor.fetchone()
    latest = db.query(models.Post).order_by(models.Post.id.desc()).first()
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Latest Post Is Currently Available!")
    return latest

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schema.Post)
def create_post(post: schema.CreatePost, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):
    # cursor.execute("""INSERT INTO posts (title ,content, published) VALUES (%s, %s, %s) RETURNING * """, (post.title, post.content, post.published))
    # new_post = cursor.fetchone()
    # conn.commit()
    new_post = models.Post(
        **post.dict(),
        author_email=current_user.email,
        owner_id=current_user.id,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.get("/{id}", response_model=schema.Post)
def get_post_id(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):
    # cursor.execute("""SELECT * FROM posts WHERE id = %s""", (id,))
    # post = cursor.fetchone()
    post = db.query(models.Post).filter(models.Post.id == id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post With id: {id} Not Found!")
    return post

@router.delete("/{id}")
def delete_post(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):
    post_query = db.query(models.Post).filter(
        models.Post.id == id,
        models.Post.owner_id == current_user.id,
    )
    if post_query.first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No Post Found With Id: {id}")
    post_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.put("/{id}", response_model=schema.Post)
def update_post(id: int, post: schema.CreatePost, db: Session = Depends(get_db), current_user: models.User = Depends(oauth2.get_current_user)):
    post_query = db.query(models.Post).filter(
        models.Post.id == id,
        models.Post.owner_id == current_user.id,
    )
    existing = post_query.first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post With Id: {id} Doesn't Exist!")
    post_query.update(post.dict(), synchronize_session=False)
    db.commit()
    updated = post_query.first()
    return updated
