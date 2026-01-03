import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Search, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PublicMenu() {
  const { restaurantId } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu/public/${restaurantId}`);
      setMenuData(response.data);
      if (response.data.categories.length > 0) {
        setActiveCategory(response.data.categories[0].id);
      }
    } catch (error) {
      console.error('Menu yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg">Menü yükleniyor...</p>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Menü bulunamadı</p>
      </div>
    );
  }

  const activeCategoryData = menuData.categories.find(cat => cat.id === activeCategory);

  // Get all items from all categories for search
  const getAllItems = () => {
    if (!menuData) return [];
    return menuData.categories.flatMap(category => 
      category.items
        .filter(item => item.is_available !== false)
        .map(item => ({
          ...item,
          categoryName: category.name,
          categoryId: category.id
        }))
    );
  };

  // Filter items based on search query
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return getAllItems().filter(item =>
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  };

  const searchResults = getSearchResults();
  const showSearchResults = searchQuery.trim().length > 0;

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {menuData.restaurant.hero_image_url && (
        <div className="w-full h-[20vh] overflow-hidden">
          <img
            src={menuData.restaurant.hero_image_url}
            alt={menuData.restaurant.name}
            className="w-full h-full object-cover"
            data-testid="hero-image"
          />
        </div>
      )}
      
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {menuData.restaurant.logo_url && (
                <img 
                  src={menuData.restaurant.logo_url} 
                  alt={menuData.restaurant.name}
                  className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-lg bg-white p-1"
                  data-testid="restaurant-logo"
                />
              )}
              {!menuData.restaurant.logo_url && (
                <h1 className="text-2xl md:text-4xl font-bold playfair truncate" data-testid="restaurant-title">
                  {menuData.restaurant.name}
                </h1>
              )}
              {menuData.restaurant.instagram_url && (
                <a
                  href={menuData.restaurant.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 hover:opacity-80 transition-opacity"
                  data-testid="instagram-link"
                  aria-label="Instagram"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Sun className="h-4 w-4" />
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} data-testid="theme-toggle" />
              <Moon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar - Always visible above categories */}
      <div className="sticky top-[73px] z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Menüde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearching(true)}
              className="pl-10 pr-10 h-11 text-base"
              data-testid="menu-search"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs - Hidden when searching */}
      {!showSearchResults && (
        <div className="sticky top-[137px] z-10 bg-background/95 backdrop-blur-sm border-b overflow-x-auto">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 py-3">
              {menuData.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                    activeCategory === category.id
                      ? 'shadow-md'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: activeCategory === category.id ? (category.bg_color || '#FFFFFF') : 'transparent',
                    color: activeCategory === category.id ? (category.name_color || '#000000') : 'inherit',
                    border: activeCategory === category.id ? 'none' : '1px solid currentColor'
                  }}
                  data-testid={`category-tab-${category.id}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {/* Search Results */}
        {showSearchResults ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                "{searchQuery}" için {searchResults.length} sonuç
              </h2>
              <button 
                onClick={clearSearch}
                className="text-sm text-primary hover:underline"
              >
                Aramayı Temizle
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
                    style={{
                      backgroundColor: item.bg_color || '#FFFFFF',
                      borderColor: item.bg_color || 'inherit'
                    }}
                    data-testid={`search-result-${item.id}`}
                  >
                    <div className="flex items-start gap-4 p-4">
                      {item.image_url && (
                        <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
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
                        <p className="text-xs text-muted-foreground mb-1">{item.categoryName}</p>
                        <div className="flex items-start justify-between gap-2">
                          <h3 
                            className="text-lg md:text-xl font-semibold" 
                            style={{ color: item.name_color || '#000000' }}
                          >
                            {item.name}
                          </h3>
                          <span className="text-lg md:text-xl font-bold text-primary whitespace-nowrap">
                            {item.price} ₺
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm md:text-base text-muted-foreground mt-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aramanızla eşleşen ürün bulunamadı</p>
                <button 
                  onClick={clearSearch}
                  className="mt-4 text-primary hover:underline"
                >
                  Tüm menüyü göster
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Category View */
          activeCategoryData && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 playfair" data-testid="active-category-title">
                {activeCategoryData.name}
              </h2>
              {activeCategoryData.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCategoryData.items
                    .filter(item => item.is_available !== false)
                    .map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
                      style={{
                        backgroundColor: item.bg_color || '#FFFFFF',
                        borderColor: item.bg_color || 'inherit'
                      }}
                      data-testid={`menu-item-${item.id}`}
                    >
                      <div className="flex items-start gap-4 p-4">
                        {item.image_url && (
                          <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
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
                          <div className="flex items-start justify-between gap-2">
                            <h3 
                              className="text-lg md:text-xl font-semibold" 
                              style={{ color: item.name_color || '#000000' }}
                              data-testid={`item-name-${item.id}`}
                            >
                              {item.name}
                            </h3>
                            <span className="text-lg md:text-xl font-bold text-primary whitespace-nowrap" data-testid={`item-price-${item.id}`}>
                              {item.price} ₺
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm md:text-base text-muted-foreground mt-2" data-testid={`item-description-${item.id}`}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12" data-testid="empty-category">
                  Bu kategoride henüz ürün bulunmamaktadır.
                </p>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}