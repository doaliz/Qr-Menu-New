import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PublicMenu() {
  const { restaurantId } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-bold playfair" data-testid="restaurant-title">
              {menuData.restaurant.name}
            </h1>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} data-testid="theme-toggle" />
              <Moon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-[73px] z-10 bg-background/95 backdrop-blur-sm border-b overflow-x-auto">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-3">
            {menuData.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                data-testid={`category-tab-${category.id}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {activeCategoryData && (
          <div>
            <h2 className="text-2xl font-semibold mb-6 playfair" data-testid="active-category-title">
              {activeCategoryData.name}
            </h2>
            {activeCategoryData.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCategoryData.items.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
                    data-testid={`menu-item-${item.id}`}
                  >
                    {item.image_url && (
                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold" data-testid={`item-name-${item.id}`}>
                          {item.name}
                        </h3>
                        <span className="text-lg font-bold text-primary ml-2" data-testid={`item-price-${item.id}`}>
                          {item.price} ₺
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground" data-testid={`item-description-${item.id}`}>
                          {item.description}
                        </p>
                      )}
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
        )}
      </main>
    </div>
  );
}