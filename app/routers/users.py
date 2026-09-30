from fastapi import status, HTTPException, Depends ,APIRouter
from passlib.context import CryptContext
from .. import models, schema ,utils
from .. database import get_db
from sqlalchemy.orm import Session


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schema.userResponse)
def create_user(user : schema.userCreate, db: Session = Depends(get_db)):

    hashed_password =utils.user_pwd(user.password)
    user.password = hashed_password
    new_user = models.User(**user.dict())
    db.add(new_user)
    db.commit()    
    db.refresh(new_user)
    return new_user

@router.get("/{id}", response_model=schema.userResponse)
def get_user(id:int ,db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User With Id: {id} Not Found!")

    return user

