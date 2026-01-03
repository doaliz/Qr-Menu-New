from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
SUPER_ADMIN_EMAIL = os.environ.get('SUPER_ADMIN_EMAIL', 'admin@qrmenu.com')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
TRIAL_DAYS = 7
YEARLY_PRICE = 999.00
security = HTTPBearer()

class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    logo_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    instagram_url: Optional[str] = None
    trial_end_date: Optional[datetime] = None
    subscription_status: str = 'trial'
    subscription_end_date: Optional[datetime] = None
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

class BulkColorUpdate(BaseModel):
    target: str  # 'categories' or 'items'
    name_color: Optional[str] = None
    bg_color: Optional[str] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    order: int = 0
    name_color: Optional[str] = '#000000'
    bg_color: Optional[str] = '#FFFFFF'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    order: Optional[int] = 0
    name_color: Optional[str] = '#000000'
    bg_color: Optional[str] = '#FFFFFF'

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    name_color: Optional[str] = None
    bg_color: Optional[str] = None

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
    is_campaign: bool = False
    campaign_only: bool = False
    name_color: Optional[str] = '#000000'
    bg_color: Optional[str] = '#FFFFFF'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    is_available: Optional[bool] = True
    is_campaign: Optional[bool] = False
    campaign_only: Optional[bool] = False
    name_color: Optional[str] = '#000000'
    bg_color: Optional[str] = '#FFFFFF'

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_campaign: Optional[bool] = None
    campaign_only: Optional[bool] = None
    name_color: Optional[str] = None
    bg_color: Optional[str] = None

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    restaurant_id: str
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CampaignCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = True

class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class ImageUpload(BaseModel):
    image_data: str
    filename: str

class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str

class ManualSubscriptionRequest(BaseModel):
    email: str
    duration_days: int

class SuperAdminRestaurantCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    license_type: Optional[str] = 'trial'  # 'trial' or 'yearly'

class RestaurantListItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subscription_status: str
    trial_end_date: Optional[datetime]
    subscription_end_date: Optional[datetime]
    created_at: datetime

class PaymentGatewayConfig(BaseModel):
    gateway_name: str  # 'iyzico', 'paytr', 'stripe', etc.
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    merchant_id: Optional[str] = None
    webhook_url: Optional[str] = None
    is_active: bool = False

class SubscriptionInfo(BaseModel):
    subscription_status: str
    trial_end_date: Optional[datetime]
    subscription_end_date: Optional[datetime]
    days_remaining: Optional[int]
    is_active: bool
    is_super_admin: bool = False

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class AccountDeletionRequest(BaseModel):
    reason: Optional[str] = None

class DeletionRequestItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    restaurant_id: str
    restaurant_name: str
    restaurant_email: str
    reason: Optional[str] = None
    status: str
    created_at: datetime

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
        
        # Get restaurant
        restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
        if not restaurant:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Restaurant not found")
        
        # Super admin bypass subscription check
        if restaurant.get('email') == SUPER_ADMIN_EMAIL:
            return restaurant_id
        
        # Migrate old data: Add trial if missing
        if not restaurant.get('trial_end_date'):
            trial_end = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)
            await db.restaurants.update_one(
                {'id': restaurant_id},
                {'$set': {
                    'trial_end_date': trial_end.isoformat(),
                    'subscription_status': 'trial'
                }}
            )
            return restaurant_id  # Allow access after migration
        
        now = datetime.now(timezone.utc)
        trial_end = datetime.fromisoformat(restaurant['trial_end_date']) if restaurant.get('trial_end_date') else None
        subscription_end = datetime.fromisoformat(restaurant['subscription_end_date']) if restaurant.get('subscription_end_date') else None
        
        # Check if trial or subscription is active
        if trial_end and now < trial_end:
            return restaurant_id  # Trial active
        
        if subscription_end and now < subscription_end and restaurant.get('subscription_status') == 'active':
            return restaurant_id  # Subscription active
        
        # Update status to expired if needed
        if restaurant.get('subscription_status') != 'expired':
            await db.restaurants.update_one(
                {'id': restaurant_id},
                {'$set': {'subscription_status': 'expired'}}
            )
        
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Deneme süreniz doldu. Lütfen abonelik satın alın."
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def is_super_admin(restaurant_id: str) -> bool:
    """Check if current user is super admin"""
    # This should be called after get_current_restaurant
    # For now, check in the caller function
    return False

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(input: RestaurantCreate):
    existing = await db.restaurants.find_one({'email': input.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(input.password)
    trial_end = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)
    restaurant_dict = {
        'id': str(uuid.uuid4()),
        'name': input.name,
        'email': input.email,
        'password': hashed_password,
        'phone': None,
        'logo_url': None,
        'hero_image_url': None,
        'instagram_url': None,
        'trial_end_date': trial_end.isoformat(),
        'subscription_status': 'trial',
        'subscription_end_date': None,
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
    
    update_data = {}
    # Handle all fields including None values (to allow deletion)
    if input.name is not None:
        update_data['name'] = input.name
    if 'logo_url' in input.model_dump(exclude_unset=True):
        update_data['logo_url'] = input.logo_url
    if 'hero_image_url' in input.model_dump(exclude_unset=True):
        update_data['hero_image_url'] = input.hero_image_url
    if 'instagram_url' in input.model_dump(exclude_unset=True):
        update_data['instagram_url'] = input.instagram_url
    
    if update_data:
        await db.restaurants.update_one({'id': restaurant_id}, {'$set': update_data})
    
    updated_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0, 'password': 0})
    return Restaurant(**updated_restaurant)

@api_router.post("/colors/bulk-update")
async def bulk_update_colors(input: BulkColorUpdate, restaurant_id: str = Depends(get_current_restaurant)):
    update_data = {}
    if input.name_color:
        update_data['name_color'] = input.name_color
    if input.bg_color:
        update_data['bg_color'] = input.bg_color
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No colors provided")
    
    if input.target == 'categories':
        result = await db.categories.update_many(
            {'restaurant_id': restaurant_id},
            {'$set': update_data}
        )
        return {"message": f"{result.modified_count} kategori güncellendi", "updated_count": result.modified_count}
    elif input.target == 'items':
        result = await db.menu_items.update_many(
            {'restaurant_id': restaurant_id},
            {'$set': update_data}
        )
        return {"message": f"{result.modified_count} ürün güncellendi", "updated_count": result.modified_count}
    else:
        raise HTTPException(status_code=400, detail="Invalid target")

@api_router.get("/subscription/info", response_model=SubscriptionInfo)
async def get_subscription_info(restaurant_id: str = Depends(get_current_restaurant)):
    restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    is_super_admin_user = restaurant.get('email') == SUPER_ADMIN_EMAIL
    
    now = datetime.now(timezone.utc)
    trial_end = datetime.fromisoformat(restaurant['trial_end_date']) if restaurant.get('trial_end_date') else None
    subscription_end = datetime.fromisoformat(restaurant['subscription_end_date']) if restaurant.get('subscription_end_date') else None
    
    is_active = False
    days_remaining = None
    current_status = restaurant.get('subscription_status', 'trial')
    
    # Priority: Active subscription > Trial
    if subscription_end and now < subscription_end and current_status == 'active':
        is_active = True
        days_remaining = (subscription_end - now).days
    elif trial_end and now < trial_end:
        is_active = True
        days_remaining = (trial_end - now).days
    
    return SubscriptionInfo(
        subscription_status=current_status,
        trial_end_date=trial_end,
        subscription_end_date=subscription_end,
        days_remaining=days_remaining,
        is_active=is_active,
        is_super_admin=is_super_admin_user
    )

@api_router.post("/admin/manual-subscription")
async def create_manual_subscription(input: ManualSubscriptionRequest, restaurant_id: str = Depends(get_current_restaurant)):
    # Check if super admin
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    # Find target restaurant by email
    target_restaurant = await db.restaurants.find_one({'email': input.email}, {'_id': 0})
    if not target_restaurant:
        raise HTTPException(status_code=404, detail="İşletme bulunamadı")
    
    # Calculate new subscription end date
    now = datetime.now(timezone.utc)
    
    # If already has active subscription, extend from current end date
    current_end = None
    if target_restaurant.get('subscription_end_date'):
        current_end = datetime.fromisoformat(target_restaurant['subscription_end_date'])
    
    if current_end and current_end > now:
        # Extend existing subscription
        new_end = current_end + timedelta(days=input.duration_days)
    else:
        # Create new subscription from now
        new_end = now + timedelta(days=input.duration_days)
    
    # Update restaurant
    await db.restaurants.update_one(
        {'id': target_restaurant['id']},
        {'$set': {
            'subscription_status': 'active',
            'subscription_end_date': new_end.isoformat()
        }}
    )
    
    # Log the manual subscription
    await db.manual_subscriptions.insert_one({
        'target_restaurant_id': target_restaurant['id'],
        'target_email': input.email,
        'admin_restaurant_id': restaurant_id,
        'duration_days': input.duration_days,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'new_end_date': new_end.isoformat()
    })
    
    return {
        "message": "Manuel abonelik eklendi",
        "restaurant_name": target_restaurant['name'],
        "new_end_date": new_end.isoformat(),
        "days_added": input.duration_days
    }

@api_router.get("/admin/restaurants", response_model=List[RestaurantListItem])
async def list_all_restaurants(restaurant_id: str = Depends(get_current_restaurant)):
    # Check if super admin
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    restaurants = await db.restaurants.find({}, {'_id': 0, 'password': 0}).to_list(1000)
    
    # Migrate old data: Add missing fields for compatibility
    restaurant_list = []
    for r in restaurants:
        # Ensure all required fields exist with defaults
        if 'subscription_status' not in r:
            r['subscription_status'] = 'trial'
        if 'trial_end_date' not in r:
            r['trial_end_date'] = None
        if 'subscription_end_date' not in r:
            r['subscription_end_date'] = None
        if 'phone' not in r:
            r['phone'] = None
        
        restaurant_list.append(RestaurantListItem(**r))
    
    return restaurant_list

@api_router.post("/admin/restaurants")
async def create_restaurant_by_admin(input: SuperAdminRestaurantCreate, restaurant_id: str = Depends(get_current_restaurant)):
    # Check if super admin
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    # Check if email already exists
    existing = await db.restaurants.find_one({'email': input.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu email adresi zaten kayıtlı")
    
    # Create restaurant
    hashed_password = hash_password(input.password)
    now = datetime.now(timezone.utc)
    
    # Determine subscription based on license_type
    if input.license_type == 'yearly':
        # Create with 1 year subscription
        subscription_status = 'active'
        trial_end_date = None
        subscription_end_date = (now + timedelta(days=365)).isoformat()
    else:
        # Create with 7 day trial
        subscription_status = 'trial'
        trial_end_date = (now + timedelta(days=TRIAL_DAYS)).isoformat()
        subscription_end_date = None
    
    restaurant_dict = {
        'id': str(uuid.uuid4()),
        'name': input.name,
        'email': input.email,
        'phone': input.phone,
        'password': hashed_password,
        'logo_url': None,
        'hero_image_url': None,
        'instagram_url': None,
        'trial_end_date': trial_end_date,
        'subscription_status': subscription_status,
        'subscription_end_date': subscription_end_date,
        'created_at': now.isoformat()
    }
    
    await db.restaurants.insert_one(restaurant_dict)
    
    license_info = "1 yıllık lisans ile" if input.license_type == 'yearly' else "7 günlük deneme ile"
    
    return {
        "message": f"İşletme oluşturuldu ({license_info})",
        "restaurant_id": restaurant_dict['id'],
        "name": restaurant_dict['name'],
        "email": restaurant_dict['email'],
        "license_type": input.license_type
    }

@api_router.get("/payment-gateway/config")
async def get_payment_config(restaurant_id: str = Depends(get_current_restaurant)):
    # Check if super admin
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    config = await db.payment_gateway_config.find_one({}, {'_id': 0})
    if not config:
        return PaymentGatewayConfig(gateway_name="none", is_active=False)
    
    return PaymentGatewayConfig(**config)

@api_router.post("/payment-gateway/config")
async def update_payment_config(input: PaymentGatewayConfig, restaurant_id: str = Depends(get_current_restaurant)):
    # Check if super admin
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    config_dict = input.model_dump()
    config_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.payment_gateway_config.delete_many({})
    await db.payment_gateway_config.insert_one(config_dict)
    
    return {"message": "Ödeme yapılandırması güncellendi"}

@api_router.post("/payments/checkout")
async def create_checkout(request: CheckoutRequest, restaurant_id: str = Depends(get_current_restaurant)):
    # Fixed package: yearly subscription
    PACKAGES = {"yearly": YEARLY_PRICE}
    
    if request.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    amount = PACKAGES[request.package_id]
    
    # Create success and cancel URLs
    success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/subscription/cancel"
    
    # Initialize Stripe
    webhook_url = f"{request.origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="try",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "restaurant_id": restaurant_id,
            "package_id": request.package_id
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Save transaction
    await db.payment_transactions.insert_one({
        'session_id': session.session_id,
        'restaurant_id': restaurant_id,
        'amount': amount,
        'currency': 'try',
        'status': 'pending',
        'payment_status': 'initiated',
        'metadata': checkout_request.metadata,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, restaurant_id: str = Depends(get_current_restaurant)):
    # Get transaction from DB
    transaction = await db.payment_transactions.find_one({'session_id': session_id, 'restaurant_id': restaurant_id}, {'_id': 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed, return cached status
    if transaction.get('payment_status') == 'paid':
        return {"status": "complete", "payment_status": "paid", "processed": True}
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status_response = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    await db.payment_transactions.update_one(
        {'session_id': session_id},
        {'$set': {
            'status': status_response.status,
            'payment_status': status_response.payment_status,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If payment succeeded and not yet processed
    if status_response.payment_status == 'paid' and transaction.get('payment_status') != 'paid':
        # Extend subscription by 365 days (yearly)
        now = datetime.now(timezone.utc)
        new_subscription_end = now + timedelta(days=365)
        
        await db.restaurants.update_one(
            {'id': restaurant_id},
            {'$set': {
                'subscription_status': 'active',
                'subscription_end_date': new_subscription_end.isoformat()
            }}
        )
    
    return {
        "status": status_response.status,
        "payment_status": status_response.payment_status,
        "amount": status_response.amount_total,
        "currency": status_response.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction
        await db.payment_transactions.update_one(
            {'session_id': webhook_response.session_id},
            {'$set': {
                'payment_status': webhook_response.payment_status,
                'event_type': webhook_response.event_type,
                'webhook_received_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

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

# Campaign endpoints
@api_router.get("/campaign")
async def get_campaign(restaurant_id: str = Depends(get_current_restaurant)):
    campaign = await db.campaigns.find_one({'restaurant_id': restaurant_id}, {'_id': 0})
    return campaign

@api_router.post("/campaign")
async def create_or_update_campaign(input: CampaignCreate, restaurant_id: str = Depends(get_current_restaurant)):
    existing = await db.campaigns.find_one({'restaurant_id': restaurant_id}, {'_id': 0})
    
    if existing:
        # Update existing campaign
        update_data = input.model_dump(exclude_unset=True)
        await db.campaigns.update_one(
            {'restaurant_id': restaurant_id},
            {'$set': update_data}
        )
        return {"message": "Kampanya güncellendi"}
    else:
        # Create new campaign
        campaign_dict = {
            'id': str(uuid.uuid4()),
            'restaurant_id': restaurant_id,
            'title': input.title,
            'description': input.description,
            'image_url': input.image_url,
            'is_active': input.is_active if input.is_active is not None else True,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.campaigns.insert_one(campaign_dict)
        return {"message": "Kampanya oluşturuldu", "id": campaign_dict['id']}

@api_router.put("/campaign")
async def update_campaign(input: CampaignUpdate, restaurant_id: str = Depends(get_current_restaurant)):
    update_data = {k: v for k, v in input.model_dump(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek alan bulunamadı")
    
    result = await db.campaigns.update_one(
        {'restaurant_id': restaurant_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadı")
    
    return {"message": "Kampanya güncellendi"}

@api_router.delete("/campaign")
async def delete_campaign(restaurant_id: str = Depends(get_current_restaurant)):
    result = await db.campaigns.delete_one({'restaurant_id': restaurant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadı")
    
    return {"message": "Kampanya silindi"}

@api_router.get("/categories", response_model=List[Category])
async def get_categories(restaurant_id: str = Depends(get_current_restaurant)):
    categories = await db.categories.find({'restaurant_id': restaurant_id}, {'_id': 0}).sort('order', 1).to_list(1000)
    
    # Migrate old data: Add default colors if missing
    for cat in categories:
        if 'name_color' not in cat or 'bg_color' not in cat:
            await db.categories.update_one(
                {'id': cat['id']},
                {'$set': {
                    'name_color': cat.get('name_color', '#000000'),
                    'bg_color': cat.get('bg_color', '#FFFFFF')
                }}
            )
            cat['name_color'] = cat.get('name_color', '#000000')
            cat['bg_color'] = cat.get('bg_color', '#FFFFFF')
    
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate, restaurant_id: str = Depends(get_current_restaurant)):
    category_dict = {
        'id': str(uuid.uuid4()),
        'restaurant_id': restaurant_id,
        'name': input.name,
        'order': input.order,
        'name_color': input.name_color or '#000000',
        'bg_color': input.bg_color or '#FFFFFF',
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
    
    # Migrate old data: Add default colors and availability if missing
    for item in items:
        update_fields = {}
        if 'name_color' not in item:
            update_fields['name_color'] = '#000000'
            item['name_color'] = '#000000'
        if 'bg_color' not in item:
            update_fields['bg_color'] = '#FFFFFF'
            item['bg_color'] = '#FFFFFF'
        if 'is_available' not in item:
            update_fields['is_available'] = True
            item['is_available'] = True
        
        if update_fields:
            await db.menu_items.update_one({'id': item['id']}, {'$set': update_fields})
    
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
        'name_color': input.name_color or '#000000',
        'bg_color': input.bg_color or '#FFFFFF',
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

# Password change endpoint
@api_router.post("/auth/change-password")
async def change_password(input: PasswordChangeRequest, restaurant_id: str = Depends(get_current_restaurant)):
    restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Verify current password
    if not verify_password(input.current_password, restaurant['password']):
        raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
    
    # Hash new password and update
    new_hashed = hash_password(input.new_password)
    await db.restaurants.update_one(
        {'id': restaurant_id},
        {'$set': {'password': new_hashed}}
    )
    
    return {"message": "Şifre başarıyla değiştirildi"}

# Account deletion request endpoint
@api_router.post("/auth/request-deletion")
async def request_account_deletion(input: AccountDeletionRequest, restaurant_id: str = Depends(get_current_restaurant)):
    restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Check if there's already a pending request
    existing = await db.deletion_requests.find_one({
        'restaurant_id': restaurant_id,
        'status': 'pending'
    }, {'_id': 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Zaten bekleyen bir silme talebiniz var")
    
    # Create deletion request
    request_dict = {
        'id': str(uuid.uuid4()),
        'restaurant_id': restaurant_id,
        'restaurant_name': restaurant['name'],
        'restaurant_email': restaurant['email'],
        'reason': input.reason,
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.deletion_requests.insert_one(request_dict)
    
    return {"message": "Hesap silme talebiniz alındı. En kısa sürede işleme alınacaktır."}

# Get deletion requests for super admin
@api_router.get("/admin/deletion-requests", response_model=List[DeletionRequestItem])
async def get_deletion_requests(restaurant_id: str = Depends(get_current_restaurant)):
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    requests = await db.deletion_requests.find({'status': 'pending'}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return [DeletionRequestItem(**r) for r in requests]

# Delete restaurant by super admin
@api_router.delete("/admin/restaurants/{target_restaurant_id}")
async def delete_restaurant(target_restaurant_id: str, restaurant_id: str = Depends(get_current_restaurant)):
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    # Find target restaurant
    target = await db.restaurants.find_one({'id': target_restaurant_id}, {'_id': 0})
    if not target:
        raise HTTPException(status_code=404, detail="İşletme bulunamadı")
    
    # Don't allow deleting super admin
    if target.get('email') == SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Super admin hesabı silinemez")
    
    # Delete all related data
    await db.categories.delete_many({'restaurant_id': target_restaurant_id})
    await db.menu_items.delete_many({'restaurant_id': target_restaurant_id})
    await db.deletion_requests.delete_many({'restaurant_id': target_restaurant_id})
    await db.restaurants.delete_one({'id': target_restaurant_id})
    
    return {"message": f"{target['name']} işletmesi ve tüm verileri silindi"}

# Reject deletion request
@api_router.post("/admin/deletion-requests/{request_id}/reject")
async def reject_deletion_request(request_id: str, restaurant_id: str = Depends(get_current_restaurant)):
    admin_restaurant = await db.restaurants.find_one({'id': restaurant_id}, {'_id': 0})
    if not admin_restaurant or admin_restaurant.get('email') != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Sadece super admin bu işlemi yapabilir")
    
    result = await db.deletion_requests.update_one(
        {'id': request_id},
        {'$set': {'status': 'rejected', 'processed_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    
    return {"message": "Silme talebi reddedildi"}

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