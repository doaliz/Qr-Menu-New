from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
security = HTTPBearer()

class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    logo_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    instagram_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class RestaurantLogin(BaseModel):
    email: EmailStr
    password: str

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    instagram_url: Optional[str] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    order: Optional[int] = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    category_id: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    is_available: Optional[bool] = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None

class ImageUpload(BaseModel):
    image_data: str
    filename: str

class TokenResponse(BaseModel):
    token: str
    restaurant: Restaurant

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(restaurant_id: str) -> str:
    payload = {
        'restaurant_id': restaurant_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

async def get_current_restaurant(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        restaurant_id = payload.get('restaurant_id')
        if not restaurant_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return restaurant_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(input: RestaurantCreate):
    existing = await db.restaurants.find_one({'email': input.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(input.password)
    restaurant_dict = {
        'id': str(uuid.uuid4()),
        'name': input.name,
        'email': input.email,
        'password': hashed_password,
        'logo_url': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.restaurants.insert_one(restaurant_dict)
    
    restaurant = Restaurant(
        id=restaurant_dict['id'],
        name=restaurant_dict['name'],
        email=restaurant_dict['email'],
        created_at=datetime.fromisoformat(restaurant_dict['created_at'])
    )
    
    token = create_token(restaurant.id)
    return TokenResponse(token=token, restaurant=restaurant)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(input: RestaurantLogin):
    restaurant_dict = await db.restaurants.find_one({'email': input.email}, {'_id': 0})
    if not restaurant_dict or not verify_password(input.password, restaurant_dict['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    restaurant = Restaurant(
        id=restaurant_dict['id'],
        name=restaurant_dict['name'],
        email=restaurant_dict['email'],
        created_at=datetime.fromisoformat(restaurant_dict['created_at'])
    )
    
    token = create_token(restaurant.id)
    return TokenResponse(token=token, restaurant=restaurant)

@api_router.get("/auth/me", response_model=Restaurant)
async def get_me(restaurant_id: str = Depends(get_current_restaurant)):
    restaurant_dict = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0, 'password': 0})
    if not restaurant_dict:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return Restaurant(**restaurant_dict)

@api_router.put("/auth/profile", response_model=Restaurant)
async def update_profile(input: RestaurantUpdate, restaurant_id: str = Depends(get_current_restaurant)):
    restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0, 'password': 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.restaurants.update_one({'id': restaurant_id}, {'$set': update_data})
    
    updated_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0, 'password': 0})
    return Restaurant(**updated_restaurant)

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), restaurant_id: str = Depends(get_current_restaurant)):
    allowed_extensions = ['jpg', 'jpeg', 'png']
    file_extension = file.filename.split('.')[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Sadece JPG, JPEG ve PNG dosyaları desteklenmektedir")
    
    max_size = 5 * 1024 * 1024
    contents = await file.read()
    
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="Dosya boyutu 5MB'dan küçük olmalıdır")
    
    image_base64 = base64.b64encode(contents).decode('utf-8')
    image_data_url = f"data:image/{file_extension};base64,{image_base64}"
    
    return {"image_url": image_data_url, "filename": file.filename}

@api_router.get("/categories", response_model=List[Category])
async def get_categories(restaurant_id: str = Depends(get_current_restaurant)):
    categories = await db.categories.find({'restaurant_id': restaurant_id}, {'_id': 0}).sort('order', 1).to_list(1000)
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate, restaurant_id: str = Depends(get_current_restaurant)):
    category_dict = {
        'id': str(uuid.uuid4()),
        'restaurant_id': restaurant_id,
        'name': input.name,
        'order': input.order,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.categories.insert_one(category_dict)
    return Category(**category_dict)

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, input: CategoryUpdate, restaurant_id: str = Depends(get_current_restaurant)):
    category = await db.categories.find_one({'id': category_id, 'restaurant_id': restaurant_id}, {'_id': 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.categories.update_one({'id': category_id}, {'$set': update_data})
    
    updated_category = await db.categories.find_one({'id': category_id}, {'_id': 0})
    return Category(**updated_category)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, restaurant_id: str = Depends(get_current_restaurant)):
    category = await db.categories.find_one({'id': category_id, 'restaurant_id': restaurant_id}, {'_id': 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await db.menu_items.delete_many({'category_id': category_id})
    await db.categories.delete_one({'id': category_id})
    
    return {"message": "Category deleted successfully"}

@api_router.get("/menu-items", response_model=List[MenuItem])
async def get_menu_items(restaurant_id: str = Depends(get_current_restaurant)):
    items = await db.menu_items.find({'restaurant_id': restaurant_id}, {'_id': 0}).to_list(1000)
    return [MenuItem(**item) for item in items]

@api_router.post("/menu-items", response_model=MenuItem)
async def create_menu_item(input: MenuItemCreate, restaurant_id: str = Depends(get_current_restaurant)):
    category = await db.categories.find_one({'id': input.category_id, 'restaurant_id': restaurant_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    item_dict = {
        'id': str(uuid.uuid4()),
        'restaurant_id': restaurant_id,
        'category_id': input.category_id,
        'name': input.name,
        'description': input.description,
        'price': input.price,
        'image_url': input.image_url,
        'is_available': input.is_available if input.is_available is not None else True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.menu_items.insert_one(item_dict)
    return MenuItem(**item_dict)

@api_router.put("/menu-items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, input: MenuItemUpdate, restaurant_id: str = Depends(get_current_restaurant)):
    item = await db.menu_items.find_one({'id': item_id, 'restaurant_id': restaurant_id}, {'_id': 0})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.menu_items.update_one({'id': item_id}, {'$set': update_data})
    
    updated_item = await db.menu_items.find_one({'id': item_id}, {'_id': 0})
    return MenuItem(**updated_item)

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, restaurant_id: str = Depends(get_current_restaurant)):
    item = await db.menu_items.find_one({'id': item_id, 'restaurant_id': restaurant_id}, {'_id': 0})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await db.menu_items.delete_one({'id': item_id})
    return {"message": "Menu item deleted successfully"}

@api_router.get("/menu/public/{restaurant_id}")
async def get_public_menu(restaurant_id: str):
    restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0, 'password': 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    categories = await db.categories.find({'restaurant_id': restaurant_id}, {'_id': 0}).sort('order', 1).to_list(1000)
    # Only fetch available menu items for public menu
    menu_items = await db.menu_items.find({
        'restaurant_id': restaurant_id, 
        'is_available': {'$ne': False}
    }, {'_id': 0}).to_list(1000)
    
    categories_with_items = []
    for category in categories:
        items = [item for item in menu_items if item['category_id'] == category['id']]
        categories_with_items.append({
            **category,
            'items': items
        })
    
    return {
        'restaurant': restaurant,
        'categories': categories_with_items
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()