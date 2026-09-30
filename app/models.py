from .database import Base
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
#for columns in sql

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer ,primary_key =True, nullable =False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    published = Column(Boolean, server_default='TRUE' ,nullable=False)
    author_email = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), nullable=True, server_default=text('now()'))

class User(Base):
    __tablename__ ="users"
    email = Column(String, nullable=False, unique=True)
    id =Column(Integer, primary_key=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))