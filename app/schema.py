from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional
# by responding with created post ,all data is shown upto user, by class we can limit what data is sended back to user

class PostBase(BaseModel):
    title: str
    content: str
    published: bool = True


class CreatePost(PostBase):
    pass


class Post(PostBase): #calling PostBase class to add-up previous data and add new data to it
    id: int
    created_at: datetime
    author_email: EmailStr | None = None
    owner_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class userCreate(BaseModel): #created user
    email: EmailStr
    password: str


class userResponse(BaseModel): #in response no class is used to limit the data sent back to user
    email: EmailStr
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class user_login(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None


class AssistantRequest(BaseModel):
    message: str


class AssistantResponse(BaseModel):
    reply: str