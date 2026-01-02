import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Users, Plus, Search, Calendar, Mail, Phone, Building, Key, Trash2, AlertTriangle, LogOut } from 'lucide-react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { user, token, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'trial', 'expired'
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingRestaurant, setAddingRestaurant] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    licenseType: 'trial' // 'trial' or 'yearly'
  });
  
  // License modal state
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isSuperAdmin) {
      navigate('/dashboard');
    } else {
      fetchRestaurants();
      fetchDeletionRequests();
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

  const fetchDeletionRequests = async () => {
    try {
      const response = await axios.get(`${API}/admin/deletion-requests`, { headers });
      setDeletionRequests(response.data);
    } catch (error) {
      console.error('Deletion requests fetch error:', error);
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
      // Create restaurant with license type
      const response = await axios.post(`${API}/admin/restaurants`, {
        name: newRestaurant.name,
        email: newRestaurant.email,
        phone: newRestaurant.phone,
        password: newRestaurant.password,
        license_type: newRestaurant.licenseType
      }, { headers });
      
      const successMsg = newRestaurant.licenseType === 'yearly' 
        ? 'İşletme oluşturuldu ve 1 yıllık lisans eklendi' 
        : 'İşletme oluşturuldu (7 günlük deneme)';
      toast.success(successMsg);
      setShowAddModal(false);
      setNewRestaurant({ name: '', email: '', phone: '', password: '', licenseType: 'trial' });
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
          duration_days: 365 // Always 1 year
        },
        { headers }
      );
      toast.success(`${response.data.restaurant_name} için 1 yıllık lisans eklendi`);
      setShowLicenseModal(false);
      setSelectedRestaurant(null);
      fetchRestaurants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lisans eklenemedi');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/admin/restaurants/${restaurantToDelete.id}`, { headers });
      toast.success(`${restaurantToDelete.name} silindi`);
      setShowDeleteConfirm(false);
      setRestaurantToDelete(null);
      fetchRestaurants();
      fetchDeletionRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşletme silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  const handleRejectDeletion = async (requestId) => {
    try {
      await axios.post(`${API}/admin/deletion-requests/${requestId}/reject`, {}, { headers });
      toast.success('Silme talebi reddedildi');
      fetchDeletionRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const openLicenseModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowLicenseModal(true);
  };

  const openDeleteConfirm = (restaurant) => {
    setRestaurantToDelete(restaurant);
    setShowDeleteConfirm(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper to get actual status of restaurant
  const getActualStatus = (restaurant) => {
    const now = new Date();
    const trialEndDate = restaurant.trial_end_date ? new Date(restaurant.trial_end_date) : null;
    const subEndDate = restaurant.subscription_end_date ? new Date(restaurant.subscription_end_date) : null;

    if (restaurant.subscription_status === 'active' && subEndDate && subEndDate > now) {
      return 'active';
    } else if (restaurant.subscription_status === 'trial' && trialEndDate && trialEndDate > now) {
      return 'trial';
    } else {
      return 'expired';
    }
  };

  const getStatusBadge = (status, trialEnd, subEnd) => {
    const now = new Date();
    const trialEndDate = trialEnd ? new Date(trialEnd) : null;
    const subEndDate = subEnd ? new Date(subEnd) : null;

    if (status === 'active' && subEndDate && subEndDate > now) {
      const daysLeft = Math.ceil((subEndDate - now) / (1000 * 60 * 60 * 24));
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Aktif ({daysLeft} gün)</span>;
    } else if (status === 'trial' && trialEndDate && trialEndDate > now) {
      const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Deneme ({daysLeft} gün)</span>;
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Süresi Dolmuş</span>;
    }
  };

  // Calculate counts for each status
  const statusCounts = {
    all: restaurants.length,
    active: restaurants.filter(r => getActualStatus(r) === 'active').length,
    trial: restaurants.filter(r => getActualStatus(r) === 'trial').length,
    expired: restaurants.filter(r => getActualStatus(r) === 'expired').length
  };

  // Filter restaurants by search term and status
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone?.includes(searchTerm);
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && getActualStatus(r) === statusFilter;
  });

  if (!user || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold playfair">Super Admin Panel</h1>
            <p className="text-muted-foreground">Tüm işletmeleri yönetin</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>

        {/* Stats Cards - Clickable for filtering */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Toplam</p>
                  <p className="text-xl md:text-2xl font-bold">{statusCounts.all}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'active' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Aktif</p>
                  <p className="text-xl md:text-2xl font-bold">{statusCounts.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'trial' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter('trial')}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Deneme</p>
                  <p className="text-xl md:text-2xl font-bold">{statusCounts.trial}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'expired' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setStatusFilter('expired')}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-full bg-red-100 dark:bg-red-900">
                  <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Süresi Dolmuş</p>
                  <p className="text-xl md:text-2xl font-bold">{statusCounts.expired}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                  <Trash2 className="h-5 w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Silme Talepleri</p>
                  <p className="text-xl md:text-2xl font-bold">{deletionRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="restaurants" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="restaurants">İşletmeler</TabsTrigger>
            <TabsTrigger value="deletion-requests" className="relative">
              Silme Talepleri
              {deletionRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {deletionRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants">
            {/* Filter indicator */}
            {statusFilter !== 'all' && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtre:</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  statusFilter === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                  statusFilter === 'trial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                }`}>
                  {statusFilter === 'active' ? 'Aktif' : statusFilter === 'trial' ? 'Deneme' : 'Süresi Dolmuş'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')} className="h-6 px-2">
                  ✕ Temizle
                </Button>
              </div>
            )}
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
                  <div className="space-y-2">
                    <Label>Lisans Türü</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={newRestaurant.licenseType === 'trial' ? 'default' : 'outline'}
                        onClick={() => setNewRestaurant({ ...newRestaurant, licenseType: 'trial' })}
                        className="w-full"
                      >
                        7 Gün Deneme
                      </Button>
                      <Button
                        type="button"
                        variant={newRestaurant.licenseType === 'yearly' ? 'default' : 'outline'}
                        onClick={() => setNewRestaurant({ ...newRestaurant, licenseType: 'yearly' })}
                        className="w-full"
                      >
                        1 Yıllık Lisans
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={addingRestaurant}>
                    {addingRestaurant ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      newRestaurant.licenseType === 'yearly' ? 'İşletme Oluştur + 1 Yıl Lisans' : 'İşletme Oluştur (Deneme)'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Restaurants Table/Cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">İşletmeler ({filteredRestaurants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== 'all' ? 'Sonuç bulunamadı' : 'Henüz kayıtlı işletme yok'}
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredRestaurants.map((restaurant) => (
                    <div key={restaurant.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">{restaurant.name}</span>
                        </div>
                        {getStatusBadge(
                          restaurant.subscription_status,
                          restaurant.trial_end_date,
                          restaurant.subscription_end_date
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{restaurant.email}</span>
                        </div>
                        {restaurant.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {restaurant.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openLicenseModal(restaurant)}
                          className="flex-1 h-8 text-xs"
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Lisans
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openDeleteConfirm(restaurant)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
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
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openLicenseModal(restaurant)}
                            >
                              <Key className="h-3 w-3 mr-1" />
                              Lisans
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => openDeleteConfirm(restaurant)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        {/* Deletion Requests Tab */}
        <TabsContent value="deletion-requests">
          <Card>
            <CardHeader>
              <CardTitle>Hesap Silme Talepleri</CardTitle>
              <CardDescription>
                Kullanıcılardan gelen hesap silme talepleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deletionRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bekleyen silme talebi yok
                </div>
              ) : (
                <div className="space-y-4">
                  {deletionRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-medium">{request.restaurant_name}</p>
                          <p className="text-sm text-muted-foreground">{request.restaurant_email}</p>
                          {request.reason && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <p className="font-medium text-xs text-muted-foreground mb-1">Sebep:</p>
                              {request.reason}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Talep: {new Date(request.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              const restaurant = restaurants.find(r => r.id === request.restaurant_id);
                              if (restaurant) openDeleteConfirm(restaurant);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Sil
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRejectDeletion(request.id)}
                          >
                            Reddet
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

        {/* License Modal */}
        <Dialog open={showLicenseModal} onOpenChange={setShowLicenseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>1 Yıllık Lisans Ekle</DialogTitle>
              <DialogDescription>
                {selectedRestaurant?.name} için 1 yıllık lisans ekleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>İşletme:</strong> {selectedRestaurant?.name}</p>
                <p className="text-sm"><strong>Email:</strong> {selectedRestaurant?.email}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Eklenecek:</strong> 365 gün (1 yıl)
                </p>
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
                  '1 Yıllık Lisans Ekle'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">İşletmeyi Sil</DialogTitle>
              <DialogDescription>
                Bu işlem geri alınamaz. İşletmenin tüm verileri silinecektir.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium">{restaurantToDelete?.name}</p>
                <p className="text-sm text-muted-foreground">{restaurantToDelete?.email}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteRestaurant}
                  disabled={deleting}
                  className="flex-1"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    'Evet, Sil'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
