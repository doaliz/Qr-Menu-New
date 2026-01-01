import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Settings() {
  const { user, token, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [logoUrl, setLogoUrl] = useState(user?.logo_url || '');
  const [heroImageUrl, setHeroImageUrl] = useState(user?.hero_image_url || '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagram_url || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Bulk color update
  const [categoryNameColor, setCategoryNameColor] = useState('#000000');
  const [categoryBgColor, setCategoryBgColor] = useState('#FFFFFF');
  const [itemNameColor, setItemNameColor] = useState('#000000');
  const [itemBgColor, setItemBgColor] = useState('#FFFFFF');
  const [updatingColors, setUpdatingColors] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const handleLogoUpload = async (e) => {
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

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      setLogoUrl(response.data.image_url);
      toast.success('Logo yüklendi');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Logo yüklenirken hata oluştu');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHeroImageUpload = async (e) => {
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

    setUploadingHero(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      setHeroImageUrl(response.data.image_url);
      toast.success('Kapak görseli yüklendi');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Görsel yüklenirken hata oluştu');
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/profile`, {
        name,
        logo_url: logoUrl || null,
        hero_image_url: heroImageUrl || null,
        instagram_url: instagramUrl || null
      }, { headers });
      
      toast.success('Profil güncellendi');
      
      // Update local storage and reload user
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast.error('Profil güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkColorUpdate = async (target) => {
    setUpdatingColors(true);
    try {
      const colors = target === 'categories' 
        ? { name_color: categoryNameColor, bg_color: categoryBgColor }
        : { name_color: itemNameColor, bg_color: itemBgColor };
      
      const response = await axios.post(`${API}/colors/bulk-update`, {
        target,
        ...colors
      }, { headers });
      
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Renkler güncellenirken hata oluştu');
    } finally {
      setUpdatingColors(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard'a Dön
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card data-testid="settings-card">
          <CardHeader>
            <CardTitle className="text-3xl playfair">Profil Ayarları</CardTitle>
            <CardDescription>İşletme bilgilerinizi güncelleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">İşletme Adı</Label>
              <Input
                id="restaurant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Kahve Dünyası"
                data-testid="restaurant-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label>İşletme Logosu (Opsiyonel)</Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  data-testid="logo-upload-input"
                />
                <p className="text-xs text-muted-foreground">
                  Desteklenen formatlar: JPG, JPEG, PNG (Max 5MB)
                </p>
                {uploadingLogo && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yükleniyor...
                  </div>
                )}
                {logoUrl && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-white">
                    <img
                      src={logoUrl}
                      alt="Logo Önizleme"
                      className="w-full h-full object-contain p-2"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setLogoUrl('')}
                      data-testid="remove-logo-button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Menü Kapak Görseli (Opsiyonel)</Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleHeroImageUpload}
                  disabled={uploadingHero}
                  data-testid="hero-image-upload-input"
                />
                <p className="text-xs text-muted-foreground">
                  Menünüzün üst kısmında görünecek kapak görseli. Desteklenen formatlar: JPG, JPEG, PNG (Max 5MB)
                </p>
                {uploadingHero && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yükleniyor...
                  </div>
                )}
                {heroImageUrl && (
                  <div className="relative w-full h-32 border rounded-lg overflow-hidden bg-muted">
                    <img
                      src={heroImageUrl}
                      alt="Kapak Görseli Önizleme"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setHeroImageUrl('')}
                      data-testid="remove-hero-button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram-url">Instagram Profil Linki (Opsiyonel)</Label>
              <Input
                id="instagram-url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/isletmeniz"
                data-testid="instagram-url-input"
              />
              <p className="text-xs text-muted-foreground">
                Instagram profil linkinizi ekleyin, menünüzde görünecektir
              </p>
            </div>

            <div className="border-t pt-6">
              <Button 
                onClick={handleSave} 
                disabled={saving || !name}
                className="w-full sm:w-auto"
                data-testid="save-profile-button"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Değişiklikleri Kaydet'
                )}
              </Button>
            </div>

            <div className="border-t pt-6">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2">Hesap Bilgileri</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {user?.email}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Email adresi değiştirilemez
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Toplu Renk Ayarları</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tüm kategoriler veya ürünler için renkleri tek seferde güncelleyin
              </p>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tüm Kategoriler</CardTitle>
                    <CardDescription>Tüm kategorilerin renklerini güncelle</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>İsim Rengi</Label>
                        <div className="flex gap-2 items-center mt-1">
                          <Input
                            type="color"
                            value={categoryNameColor}
                            onChange={(e) => setCategoryNameColor(e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={categoryNameColor}
                            onChange={(e) => setCategoryNameColor(e.target.value)}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Arka Plan Rengi</Label>
                        <div className="flex gap-2 items-center mt-1">
                          <Input
                            type="color"
                            value={categoryBgColor}
                            onChange={(e) => setCategoryBgColor(e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={categoryBgColor}
                            onChange={(e) => setCategoryBgColor(e.target.value)}
                            placeholder="#FFFFFF"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleBulkColorUpdate('categories')}
                      disabled={updatingColors}
                      className="w-full"
                    >
                      {updatingColors ? 'Güncelleniyor...' : 'Tüm Kategorileri Güncelle'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tüm Ürünler</CardTitle>
                    <CardDescription>Tüm ürünlerin renklerini güncelle</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>İsim Rengi</Label>
                        <div className="flex gap-2 items-center mt-1">
                          <Input
                            type="color"
                            value={itemNameColor}
                            onChange={(e) => setItemNameColor(e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={itemNameColor}
                            onChange={(e) => setItemNameColor(e.target.value)}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Arka Plan Rengi</Label>
                        <div className="flex gap-2 items-center mt-1">
                          <Input
                            type="color"
                            value={itemBgColor}
                            onChange={(e) => setItemBgColor(e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={itemBgColor}
                            onChange={(e) => setItemBgColor(e.target.value)}
                            placeholder="#FFFFFF"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleBulkColorUpdate('items')}
                      disabled={updatingColors}
                      className="w-full"
                    >
                      {updatingColors ? 'Güncelleniyor...' : 'Tüm Ürünleri Güncelle'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
