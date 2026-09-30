import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(os.path.join(os.path.dirname(__file__), "pass.env"))
SQLALCHEMY_DATABASE_URL = os.getenv("DB_PASSWORD")
if not SQLALCHEMY_DATABASE_URL:
  raise RuntimeError("DB_PASSWORD is missing from app/pass.env")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
      yield db
    finally:
      db.close()

#for connection to postgresql
