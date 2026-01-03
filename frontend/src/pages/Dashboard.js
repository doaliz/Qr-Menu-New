import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, LogOut, Moon, Sun, QrCode, Menu as MenuIcon, Palette, Download, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import SubscriptionBanner from '@/components/SubscriptionBanner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  
  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', order: 0, name_color: '#000000', bg_color: '#FFFFFF' });
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', is_available: true, is_campaign: false, campaign_only: false, name_color: '#000000', bg_color: '#FFFFFF' });
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // PWA Install prompt handler
  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isIOSDevice && !isStandalone) {
      // Show iOS install instructions
      const hasSeenIOSPrompt = localStorage.getItem('ios-install-prompt-seen');
      if (!hasSeenIOSPrompt) {
        setShowIOSInstall(true);
      }
    }

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hide button if app is installed
    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      toast.success('Uygulama masaüstüne eklendi!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('Uygulama masaüstüne ekleniyor...');
      }
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  const dismissIOSPrompt = () => {
    setShowIOSInstall(false);
    localStorage.setItem('ios-install-prompt-seen', 'true');
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes, subscriptionRes] = await Promise.all([
        axios.get(`${API}/categories`, { headers }),
        axios.get(`${API}/menu-items`, { headers }),
        axios.get(`${API}/subscription/info`, { headers }).catch(() => null)
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
      if (subscriptionRes) {
        setSubscriptionInfo(subscriptionRes.data);
      }
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      await axios.post(`${API}/categories`, categoryForm, { headers });
      toast.success('Kategori eklendi');
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', order: 0, name_color: '#000000', bg_color: '#FFFFFF' });
      fetchData();
    } catch (error) {
      toast.error('Kategori eklenirken hata oluştu');
    }
  };

  const handleUpdateCategory = async () => {
    try {
      await axios.put(`${API}/categories/${editingCategory.id}`, categoryForm, { headers });
      toast.success('Kategori güncellendi');
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', order: 0, name_color: '#000000', bg_color: '#FFFFFF' });
      fetchData();
    } catch (error) {
      toast.error('Kategori güncellenirken hata oluştu');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Bu kategori ve içindeki tüm ürünler silinecek. Emin misiniz?')) return;
    
    try {
      await axios.delete(`${API}/categories/${id}`, { headers });
      toast.success('Kategori silindi');
      fetchData();
    } catch (error) {
      toast.error('Kategori silinirken hata oluştu');
    }
  };

  const handleCreateItem = async () => {
    try {
      await axios.post(`${API}/menu-items`, {
        ...itemForm,
        price: parseFloat(itemForm.price)
      }, { headers });
      toast.success('Ürün eklendi');
      setItemDialogOpen(false);
      setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '', is_available: true });
      fetchData();
    } catch (error) {
      toast.error('Ürün eklenirken hata oluştu');
    }
  };

  const handleUpdateItem = async () => {
    try {
      await axios.put(`${API}/menu-items/${editingItem.id}`, {
        ...itemForm,
        price: parseFloat(itemForm.price)
      }, { headers });
      toast.success('Ürün güncellendi');
      setItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '', is_available: true });
      fetchData();
    } catch (error) {
      toast.error('Ürün güncellenirken hata oluştu');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API}/menu-items/${id}`, { headers });
      toast.success('Ürün silindi');
      fetchData();
    } catch (error) {
      toast.error('Ürün silinirken hata oluştu');
    }
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ 
      name: category.name, 
      order: category.order,
      name_color: category.name_color || '#000000',
      bg_color: category.bg_color || '#FFFFFF'
    });
    setCategoryDialogOpen(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || '',
      is_available: item.is_available !== undefined ? item.is_available : true,
      name_color: item.name_color || '#000000',
      bg_color: item.bg_color || '#FFFFFF'
    });
    setItemDialogOpen(true);
  };

  const openCreateItem = (categoryId) => {
    setItemForm({ name: '', description: '', price: '', category_id: categoryId, image_url: '', is_available: true, name_color: '#000000', bg_color: '#FFFFFF' });
    setItemDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Sadece JPG, JPEG ve PNG dosyaları yüklenebilir');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      setItemForm({ ...itemForm, image_url: response.data.image_url });
      toast.success('Fotoğraf yüklendi');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fotoğraf yüklenirken hata oluştu');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleItemAvailability = async (item) => {
    try {
      await axios.put(`${API}/menu-items/${item.id}`, {
        is_available: !item.is_available
      }, { headers });
      toast.success(item.is_available ? 'Ürün satışa kapatıldı' : 'Ürün satışa açıldı');
      fetchData();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SubscriptionBanner />
      
      {/* iOS Install Banner */}
      {showIOSInstall && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 md:hidden">
          <div className="container mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="h-5 w-5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium">Masaüstüne Ekle</p>
                <p className="opacity-90">Paylaş → Ana Ekrana Ekle</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={dismissIOSPrompt} className="flex-shrink-0 h-7 text-xs">
              Tamam
            </Button>
          </div>
        </div>
      )}
      
      {/* Android/Chrome Install Banner */}
      {showInstallButton && !isIOS && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 md:hidden">
          <div className="container mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Download className="h-5 w-5 flex-shrink-0" />
              <p className="text-xs font-medium">Uygulamayı masaüstüne ekle</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleInstallClick} className="flex-shrink-0 h-7 text-xs">
              Ekle
            </Button>
          </div>
        </div>
      )}
      
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold playfair truncate" data-testid="restaurant-name">{user?.name}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Admin Paneli</p>
              {subscriptionInfo && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    subscriptionInfo.subscription_status === 'trial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    subscriptionInfo.subscription_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {subscriptionInfo.subscription_status === 'trial' && 'Deneme'}
                    {subscriptionInfo.subscription_status === 'active' && 'Aktif'}
                    {subscriptionInfo.subscription_status === 'expired' && 'Süresi Dolmuş'}
                  </span>
                  {subscriptionInfo.days_remaining !== null && (
                    <span className="text-xs text-muted-foreground">
                      {subscriptionInfo.days_remaining} gün kaldı
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Desktop Install Button */}
              {showInstallButton && !isIOS && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallClick}
                  className="hidden md:flex"
                  title="Masaüstüne Ekle"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Yükle
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                data-testid="settings-button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:mr-2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                <span className="hidden md:inline">Ayarlar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/subscription')}
                data-testid="subscription-button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:mr-2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                <span className="hidden md:inline">Abonelik</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/qr-code')}
                data-testid="qr-code-button"
              >
                <QrCode className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">QR Kod</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/menu/${user?.id}`)}
                className="hidden md:flex"
                data-testid="view-menu-button"
              >
                <MenuIcon className="h-4 w-4 mr-2" />
                Menüyü Görüntüle
              </Button>
              <div className="hidden md:flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} data-testid="theme-toggle" />
                <Moon className="h-4 w-4" />
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Çıkış</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl md:text-3xl font-semibold playfair">Menü Yönetimi</h2>
          <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
            setCategoryDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              setCategoryForm({ name: '', order: 0, name_color: '#000000', bg_color: '#FFFFFF' });
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="add-category-button" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Kategori Ekle
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="category-dialog">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}</DialogTitle>
                <DialogDescription>Menünüze yeni bir kategori ekleyin</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Kategori Adı</Label>
                  <Input
                    id="category-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Örn: Ana Yemekler"
                    data-testid="category-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="category-order">Sıra</Label>
                  <Input
                    id="category-order"
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                    data-testid="category-order-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-name-color">İsim Rengi</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="category-name-color"
                        type="color"
                        value={categoryForm.name_color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="category-name-color-input"
                      />
                      <Input
                        value={categoryForm.name_color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name_color: e.target.value })}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category-bg-color">Arka Plan Rengi</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="category-bg-color"
                        type="color"
                        value={categoryForm.bg_color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, bg_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="category-bg-color-input"
                      />
                      <Input
                        value={categoryForm.bg_color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, bg_color: e.target.value })}
                        placeholder="#FFFFFF"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                  data-testid="save-category-button"
                >
                  {editingCategory ? 'Güncelle' : 'Ekle'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => {
            const items = menuItems.filter(item => item.category_id === category.id);
            return (
              <Card key={category.id} className="shadow-sm" data-testid={`category-${category.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg md:text-xl truncate">{category.name}</CardTitle>
                      <CardDescription>{items.length} ürün</CardDescription>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditCategory(category)}
                        data-testid={`edit-category-${category.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteCategory(category.id)}
                        data-testid={`delete-category-${category.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg" data-testid={`menu-item-${item.id}`}>
                      {item.image_url && (
                        <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.parentElement.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm md:text-base">{item.name}</h4>
                          {!item.is_available && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded whitespace-nowrap" data-testid={`unavailable-badge-${item.id}`}>
                              Satışta Değil
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                        )}
                        <p className="text-sm font-semibold text-primary mt-1">{item.price} ₺</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground hidden sm:inline">Satışta</span>
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() => toggleItemAvailability(item)}
                            data-testid={`item-availability-switch-${item.id}`}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditItem(item)}
                            data-testid={`edit-item-${item.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteItem(item.id)}
                            data-testid={`delete-item-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openCreateItem(category.id)}
                    data-testid={`add-item-${category.id}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ürün Ekle
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12" data-testid="empty-state">
            <p className="text-muted-foreground mb-4">Henüz kategori eklenmemiş</p>
            <Button onClick={() => setCategoryDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Kategoriyi Ekle
            </Button>
          </div>
        )}

        <Dialog open={itemDialogOpen} onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '', is_available: true, name_color: '#000000', bg_color: '#FFFFFF' });
          }
        }}>
          <DialogContent data-testid="item-dialog" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Ürün Düzenle' : 'Yeni Ürün'}</DialogTitle>
              <DialogDescription>Menünüze yeni bir ürün ekleyin</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item-name">Ürün Adı</Label>
                <Input
                  id="item-name"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Örn: Margherita Pizza"
                  data-testid="item-name-input"
                />
              </div>
              <div>
                <Label htmlFor="item-description">Açıklama (Opsiyonel)</Label>
                <Textarea
                  id="item-description"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ürün açıklaması..."
                  data-testid="item-description-input"
                />
              </div>
              <div>
                <Label htmlFor="item-price">Fiyat (₺)</Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="0.00"
                  data-testid="item-price-input"
                />
              </div>
              <div>
                <Label htmlFor="item-image">Fotoğraf (Opsiyonel)</Label>
                <div className="space-y-2">
                  <Input
                    id="item-image"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    data-testid="item-image-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Desteklenen formatlar: JPG, JPEG, PNG (Max 5MB)
                  </p>
                  {uploadingImage && (
                    <p className="text-xs text-primary">Yükleniyor...</p>
                  )}
                  {itemForm.image_url && (
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      <img
                        src={itemForm.image_url}
                        alt="Önizleme"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setItemForm({ ...itemForm, image_url: '' })}
                        data-testid="remove-image-button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="item-available"
                  checked={itemForm.is_available}
                  onCheckedChange={(checked) => setItemForm({ ...itemForm, is_available: checked })}
                  data-testid="item-available-switch"
                />
                <Label htmlFor="item-available">Satışta</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item-name-color">İsim Rengi</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="item-name-color"
                      type="color"
                      value={itemForm.name_color}
                      onChange={(e) => setItemForm({ ...itemForm, name_color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                      data-testid="item-name-color-input"
                    />
                    <Input
                      value={itemForm.name_color}
                      onChange={(e) => setItemForm({ ...itemForm, name_color: e.target.value })}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="item-bg-color">Arka Plan Rengi</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="item-bg-color"
                      type="color"
                      value={itemForm.bg_color}
                      onChange={(e) => setItemForm({ ...itemForm, bg_color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                      data-testid="item-bg-color-input"
                    />
                    <Input
                      value={itemForm.bg_color}
                      onChange={(e) => setItemForm({ ...itemForm, bg_color: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={editingItem ? handleUpdateItem : handleCreateItem}
                data-testid="save-item-button"
              >
                {editingItem ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}