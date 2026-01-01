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
import { Plus, Edit, Trash2, LogOut, Moon, Sun, QrCode, Menu as MenuIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', order: 0 });
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', is_available: true });
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        axios.get(`${API}/categories`, { headers }),
        axios.get(`${API}/menu-items`, { headers })
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
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
      setCategoryForm({ name: '', order: 0 });
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
      setCategoryForm({ name: '', order: 0 });
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
      setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '' });
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
      setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '' });
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
    setCategoryForm({ name: category.name, order: category.order });
    setCategoryDialogOpen(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || ''
    });
    setItemDialogOpen(true);
  };

  const openCreateItem = (categoryId) => {
    setItemForm({ name: '', description: '', price: '', category_id: categoryId, image_url: '' });
    setItemDialogOpen(true);
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
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold playfair" data-testid="restaurant-name">{user?.name}</h1>
            <p className="text-sm text-muted-foreground">Admin Paneli</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/qr-code')}
              data-testid="qr-code-button"
            >
              <QrCode className="h-4 w-4 mr-2" />
              QR Kod
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/menu/${user?.id}`)}
              data-testid="view-menu-button"
            >
              <MenuIcon className="h-4 w-4 mr-2" />
              Menüyü Görüntüle
            </Button>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} data-testid="theme-toggle" />
              <Moon className="h-4 w-4" />
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold playfair">Menü Yönetimi</h2>
          <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
            setCategoryDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              setCategoryForm({ name: '', order: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="add-category-button">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const items = menuItems.filter(item => item.category_id === category.id);
            return (
              <Card key={category.id} className="shadow-sm" data-testid={`category-${category.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                      <CardDescription>{items.length} ürün</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditCategory(category)}
                        data-testid={`edit-category-${category.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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
                    <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg" data-testid={`menu-item-${item.id}`}>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                        <p className="text-sm font-semibold text-primary mt-1">{item.price} ₺</p>
                      </div>
                      <div className="flex gap-1 ml-2">
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
            setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '' });
          }
        }}>
          <DialogContent data-testid="item-dialog">
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
                <Label htmlFor="item-image">Fotoğraf URL (Opsiyonel)</Label>
                <Input
                  id="item-image"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                  placeholder="https://..."
                  data-testid="item-image-input"
                />
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