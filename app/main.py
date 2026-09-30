from fastapi import FastAPI, status, HTTPException, Response, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
# from pydantic import BaseModel  it is imported through OOP
from typing import List
import os
from passlib.context import CryptContext
# Direct PostgreSQL connection (kept commented):
# import psycopg
# from psycopg.rows import dict_row
# import time
from . import models, schema ,utils
from .database import engine, get_db
from sqlalchemy.orm import Session
from .routers import assistant, posts, users
from . import auth

models.Base.metadata.create_all(bind=engine)


app = FastAPI()

app.include_router(posts.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(assistant.router)
# PostgreSQL direct connection example (kept commented):
# while True:
#     try:
#         conn = psycopg.connect(host='localhost', dbname='fastapi', user='postgres', password='your_password', row_factory=dict_row)
#         cursor = conn.cursor()
#         print("Database Connection Is Successful!")
#         break
#     except Exception as error:
#         print("Database Connection Is Unsuccessful!")
#         print("Error:", error)
#         time.sleep(2)


#For Interface Made By Co-Agent
@app.get("/ui", response_class=HTMLResponse)
def get_ui():
    html_file = os.path.join(os.path.dirname(__file__), "static", "index.html")
    with open(html_file, 'r', encoding='utf-8') as f:
        return f.read()

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")




