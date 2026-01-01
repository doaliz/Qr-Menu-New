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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/profile`, {
        name,
        logo_url: logoUrl || null
      }, { headers });
      
      toast.success('Profil güncellendi');
      
      // Force re-login to update user context
      setTimeout(() => {
        logout();
        navigate('/login');
        toast.info('Değişikliklerin geçerli olması için tekrar giriş yapın');
      }, 1000);
    } catch (error) {
      toast.error('Profil güncellenirken hata oluştu');
    } finally {
      setSaving(false);
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
