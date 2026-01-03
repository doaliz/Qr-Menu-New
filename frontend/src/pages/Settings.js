import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Trash2, Loader2, Lock, AlertTriangle, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  // Campaign
  const [campaign, setCampaign] = useState(null);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [campaignActive, setCampaignActive] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [uploadingCampaignImage, setUploadingCampaignImage] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch campaign on load
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await axios.get(`${API}/campaign`, { headers });
        if (response.data) {
          setCampaign(response.data);
          setCampaignTitle(response.data.title || '');
          setCampaignDescription(response.data.description || '');
          setCampaignImageUrl(response.data.image_url || '');
          setCampaignActive(response.data.is_active !== false);
        }
      } catch (error) {
        // No campaign exists, that's fine
      }
    };
    fetchCampaign();
  }, []);

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

  const handleCampaignImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı');
      return;
    }

    setUploadingCampaignImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setCampaignImageUrl(response.data.image_url);
      toast.success('Kampanya görseli yüklendi');
    } catch (error) {
      toast.error('Görsel yüklenirken hata oluştu');
    } finally {
      setUploadingCampaignImage(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!campaignTitle.trim()) {
      toast.error('Kampanya başlığı gerekli');
      return;
    }

    setSavingCampaign(true);
    try {
      await axios.post(`${API}/campaign`, {
        title: campaignTitle,
        description: campaignDescription || null,
        image_url: campaignImageUrl || null,
        is_active: campaignActive
      }, { headers });
      
      toast.success('Kampanya kaydedildi');
    } catch (error) {
      toast.error('Kampanya kaydedilirken hata oluştu');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async () => {
    try {
      await axios.delete(`${API}/campaign`, { headers });
      setCampaign(null);
      setCampaignTitle('');
      setCampaignDescription('');
      setCampaignImageUrl('');
      setCampaignActive(true);
      toast.success('Kampanya silindi');
    } catch (error) {
      toast.error('Kampanya silinirken hata oluştu');
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

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalı');
      return;
    }

    setChangingPassword(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, { headers });
      
      toast.success('Şifre başarıyla değiştirildi');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Şifre değiştirilemedi');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestDeletion = async () => {
    setRequestingDeletion(true);
    try {
      await axios.post(`${API}/auth/request-deletion`, {
        reason: deleteReason
      }, { headers });
      
      toast.success('Hesap silme talebiniz alındı');
      setShowDeleteModal(false);
      setDeleteReason('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Talep gönderilemedi');
    } finally {
      setRequestingDeletion(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard&apos;a Dön
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
          </CardContent>
        </Card>

        {/* Campaign Management Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-500" />
              Kampanya Yönetimi
            </CardTitle>
            <CardDescription>
              Menünüzde gösterilecek kampanya/duyuru ayarları. Aktif kampanya varsa müşteri menüyü açtığında popup olarak görünür.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Kampanya Aktif</span>
              </div>
              <Switch
                checked={campaignActive}
                onCheckedChange={setCampaignActive}
                data-testid="campaign-active-switch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-title">Kampanya Başlığı *</Label>
              <Input
                id="campaign-title"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="Örn: %20 İndirim Fırsatı!"
                data-testid="campaign-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-description">Kampanya Açıklaması (Opsiyonel)</Label>
              <Textarea
                id="campaign-description"
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
                placeholder="Kampanya detaylarını yazın..."
                rows={3}
                data-testid="campaign-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Kampanya Görseli (Opsiyonel)</Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleCampaignImageUpload}
                  disabled={uploadingCampaignImage}
                  data-testid="campaign-image-input"
                />
                <p className="text-xs text-muted-foreground">
                  Popup'ta gösterilecek görsel. Desteklenen formatlar: JPG, JPEG, PNG (Max 5MB)
                </p>
                {uploadingCampaignImage && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yükleniyor...
                  </div>
                )}
                {campaignImageUrl && (
                  <div className="relative w-full max-w-md h-40 border rounded-lg overflow-hidden bg-muted">
                    <img
                      src={campaignImageUrl}
                      alt="Kampanya Önizleme"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setCampaignImageUrl('')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleSaveCampaign} 
                disabled={savingCampaign || !campaignTitle.trim()}
                data-testid="save-campaign-button"
              >
                {savingCampaign ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Kampanyayı Kaydet'
                )}
              </Button>
              {campaign && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteCampaign}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Kampanyayı Sil
                </Button>
              )}
            </div>

            {campaignTitle && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Önizleme:</p>
                <div className="bg-background rounded-lg p-4 shadow-sm">
                  {campaignImageUrl && (
                    <img src={campaignImageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <h4 className="font-bold text-lg">{campaignTitle}</h4>
                  {campaignDescription && <p className="text-sm text-muted-foreground mt-1">{campaignDescription}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Card Continues */}
        <Card data-testid="settings-card">
          <CardHeader>
            <CardTitle>Diğer Ayarlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-b pb-6">
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

            {/* Password Change Section */}
            <div className="border-b pb-6">
              <h3 className="text-xl font-semibold mb-4">Güvenlik</h3>
              <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Lock className="h-4 w-4 mr-2" />
                    Şifre Değiştir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Şifre Değiştir</DialogTitle>
                    <DialogDescription>
                      Hesabınızın güvenliği için şifrenizi değiştirin
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Mevcut Şifre</Label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yeni Şifre</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yeni Şifre (Tekrar)</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button 
                      onClick={handlePasswordChange} 
                      className="w-full"
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Değiştiriliyor...
                        </>
                      ) : (
                        'Şifreyi Değiştir'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Account Deletion Section */}
            <div>
              <h3 className="text-xl font-semibold mb-2 text-destructive">Tehlikeli Bölge</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Hesabınızı silmek istiyorsanız talep gönderebilirsiniz. Bu işlem geri alınamaz.
              </p>
              <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Hesap Silme Talebi
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Hesap Silme Talebi</DialogTitle>
                    <DialogDescription>
                      Bu işlem tüm verilerinizi kalıcı olarak silecektir. Talebiniz onaylandıktan sonra geri alınamaz.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">Uyarı!</p>
                      <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside space-y-1">
                        <li>Tüm menü ve ürün bilgileriniz silinecek</li>
                        <li>QR kodunuz çalışmayacak</li>
                        <li>Bu işlem geri alınamaz</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Label>Silme Sebebi (Opsiyonel)</Label>
                      <Textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Hesabınızı neden silmek istediğinizi belirtebilirsiniz..."
                        rows={3}
                      />
                    </div>
                    <Button 
                      variant="destructive"
                      onClick={handleRequestDeletion} 
                      className="w-full"
                      disabled={requestingDeletion}
                    >
                      {requestingDeletion ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gönderiliyor...
                        </>
                      ) : (
                        'Silme Talebi Gönder'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
