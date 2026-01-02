import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Users, Plus, Search, Calendar, Mail, Phone, Building, Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { user, token, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingRestaurant, setAddingRestaurant] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  
  // License modal state
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseDuration, setLicenseDuration] = useState('365');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isSuperAdmin) {
      navigate('/dashboard');
    } else {
      fetchRestaurants();
    }
  }, [user, isSuperAdmin, navigate]);

  const fetchRestaurants = async () => {
    try {
      const response = await axios.get(`${API}/admin/restaurants`, { headers });
      setRestaurants(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşletmeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    
    if (!newRestaurant.name || !newRestaurant.email || !newRestaurant.password) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setAddingRestaurant(true);
    try {
      await axios.post(`${API}/admin/restaurants`, newRestaurant, { headers });
      toast.success('İşletme başarıyla oluşturuldu');
      setShowAddModal(false);
      setNewRestaurant({ name: '', email: '', phone: '', password: '' });
      fetchRestaurants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşletme oluşturulamadı');
    } finally {
      setAddingRestaurant(false);
    }
  };

  const handleAddLicense = async () => {
    if (!selectedRestaurant) return;
    
    setLicenseLoading(true);
    try {
      const response = await axios.post(
        `${API}/admin/manual-subscription`,
        {
          email: selectedRestaurant.email,
          duration_days: parseInt(licenseDuration)
        },
        { headers }
      );
      toast.success(`${response.data.restaurant_name} için ${response.data.days_added} gün lisans eklendi`);
      setShowLicenseModal(false);
      setSelectedRestaurant(null);
      setLicenseDuration('365');
      fetchRestaurants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lisans eklenemedi');
    } finally {
      setLicenseLoading(false);
    }
  };

  const openLicenseModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowLicenseModal(true);
  };
      setShowAddModal(false);
      setNewRestaurant({ name: '', email: '', phone: '', password: '' });
      fetchRestaurants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşletme oluşturulamadı');
    } finally {
      setAddingRestaurant(false);
    }
  };

  const getStatusBadge = (status, trialEnd, subEnd) => {
    const now = new Date();
    const trialEndDate = trialEnd ? new Date(trialEnd) : null;
    const subEndDate = subEnd ? new Date(subEnd) : null;

    if (status === 'active' && subEndDate && subEndDate > now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Aktif</span>;
    } else if (status === 'trial' && trialEndDate && trialEndDate > now) {
      const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Deneme ({daysLeft} gün)</span>;
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Süresi Dolmuş</span>;
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone?.includes(searchTerm)
  );

  if (!user || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard&apos;a Dön
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold playfair mb-2">Super Admin Panel</h1>
          <p className="text-muted-foreground">Tüm işletmeleri yönetin</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam İşletme</p>
                  <p className="text-2xl font-bold">{restaurants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktif Abonelik</p>
                  <p className="text-2xl font-bold">
                    {restaurants.filter(r => r.subscription_status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deneme Süresinde</p>
                  <p className="text-2xl font-bold">
                    {restaurants.filter(r => r.subscription_status === 'trial').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="İşletme ara (isim, email, telefon)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button data-testid="add-restaurant-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni İşletme
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni İşletme Ekle</DialogTitle>
                  <DialogDescription>
                    Yeni bir işletme hesabı oluşturun
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddRestaurant} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">İşletme Adı *</Label>
                    <Input
                      id="name"
                      value={newRestaurant.name}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                      placeholder="Cafe XYZ"
                      required
                      data-testid="new-restaurant-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newRestaurant.email}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, email: e.target.value })}
                      placeholder="info@cafexyz.com"
                      required
                      data-testid="new-restaurant-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={newRestaurant.phone}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, phone: e.target.value })}
                      placeholder="05XX XXX XX XX"
                      data-testid="new-restaurant-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newRestaurant.password}
                      onChange={(e) => setNewRestaurant({ ...newRestaurant, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      data-testid="new-restaurant-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={addingRestaurant}>
                    {addingRestaurant ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      'İşletme Oluştur'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Restaurants Table */}
        <Card>
          <CardHeader>
            <CardTitle>İşletmeler</CardTitle>
            <CardDescription>
              Sistemde kayıtlı tüm işletmelerin listesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz kayıtlı işletme yok'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İşletme</TableHead>
                      <TableHead>İletişim</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Kayıt Tarihi</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRestaurants.map((restaurant) => (
                      <TableRow key={restaurant.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{restaurant.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {restaurant.email}
                            </div>
                            {restaurant.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {restaurant.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(
                            restaurant.subscription_status,
                            restaurant.trial_end_date,
                            restaurant.subscription_end_date
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(restaurant.created_at).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openLicenseModal(restaurant)}
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Lisans Ekle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* License Modal */}
        <Dialog open={showLicenseModal} onOpenChange={setShowLicenseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lisans Ekle</DialogTitle>
              <DialogDescription>
                {selectedRestaurant?.name} için lisans süresi ekleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>İşletme:</strong> {selectedRestaurant?.name}</p>
                <p className="text-sm"><strong>Email:</strong> {selectedRestaurant?.email}</p>
              </div>
              <div className="space-y-2">
                <Label>Lisans Süresi</Label>
                <Select value={licenseDuration} onValueChange={setLicenseDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Süre seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">1 Ay (30 Gün)</SelectItem>
                    <SelectItem value="90">3 Ay (90 Gün)</SelectItem>
                    <SelectItem value="180">6 Ay (180 Gün)</SelectItem>
                    <SelectItem value="365">1 Yıl (365 Gün)</SelectItem>
                    <SelectItem value="730">2 Yıl (730 Gün)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAddLicense} 
                className="w-full" 
                disabled={licenseLoading}
              >
                {licenseLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ekleniyor...
                  </>
                ) : (
                  'Lisans Ekle'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
