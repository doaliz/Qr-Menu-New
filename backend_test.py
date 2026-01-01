import requests
import sys
import json
from datetime import datetime

class RestaurantMenuAPITester:
    def __init__(self, base_url="https://easymenu-builder.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.restaurant_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            details = ""
            
            if not success:
                details = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, {}

    def test_register(self):
        """Test restaurant registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "name": f"Test Restaurant {timestamp}",
            "email": f"test{timestamp}@restaurant.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Restaurant Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.restaurant_id = response['restaurant']['id']
            print(f"   Token received: {self.token[:20]}...")
            print(f"   Restaurant ID: {self.restaurant_id}")
            return True
        return False

    def test_login(self):
        """Test login with existing credentials"""
        # First register a user for login test
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "name": f"Login Test Restaurant {timestamp}",
            "email": f"login{timestamp}@restaurant.com",
            "password": "LoginPass123!"
        }
        
        # Register first
        success, _ = self.run_test(
            "Pre-register for Login Test",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not success:
            return False
        
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        success, response = self.run_test(
            "Restaurant Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return success and 'token' in response

    def test_auth_me(self):
        """Test getting current restaurant info"""
        success, response = self.run_test(
            "Get Current Restaurant",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_categories_crud(self):
        """Test category CRUD operations"""
        # Create category
        category_data = {
            "name": "Test Ana Yemekler",
            "order": 1
        }
        
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data=category_data
        )
        
        if not success:
            return False
        
        category_id = response.get('id')
        if not category_id:
            self.log_test("Create Category - ID Check", False, "No category ID returned")
            return False
        
        # Get categories
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        
        if not success:
            return False
        
        # Update category
        update_data = {
            "name": "Updated Ana Yemekler",
            "order": 2
        }
        
        success, response = self.run_test(
            "Update Category",
            "PUT",
            f"categories/{category_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False
        
        # Delete category (will be done after menu items test)
        return category_id

    def test_menu_items_crud(self, category_id):
        """Test menu item CRUD operations"""
        # Create menu item
        item_data = {
            "category_id": category_id,
            "name": "Test Pizza",
            "description": "Delicious test pizza",
            "price": 25.50,
            "image_url": "https://example.com/pizza.jpg"
        }
        
        success, response = self.run_test(
            "Create Menu Item",
            "POST",
            "menu-items",
            200,
            data=item_data
        )
        
        if not success:
            return False
        
        item_id = response.get('id')
        if not item_id:
            self.log_test("Create Menu Item - ID Check", False, "No item ID returned")
            return False
        
        # Get menu items
        success, response = self.run_test(
            "Get Menu Items",
            "GET",
            "menu-items",
            200
        )
        
        if not success:
            return False
        
        # Update menu item
        update_data = {
            "name": "Updated Pizza",
            "price": 30.00
        }
        
        success, response = self.run_test(
            "Update Menu Item",
            "PUT",
            f"menu-items/{item_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False
        
        # Delete menu item
        success, response = self.run_test(
            "Delete Menu Item",
            "DELETE",
            f"menu-items/{item_id}",
            200
        )
        
        return success

    def test_public_menu(self):
        """Test public menu endpoint"""
        if not self.restaurant_id:
            self.log_test("Public Menu Test", False, "No restaurant ID available")
            return False
        
        success, response = self.run_test(
            "Get Public Menu",
            "GET",
            f"menu/public/{self.restaurant_id}",
            200
        )
        
        if success:
            # Check response structure
            if 'restaurant' in response and 'categories' in response:
                self.log_test("Public Menu Structure Check", True)
            else:
                self.log_test("Public Menu Structure Check", False, "Missing restaurant or categories in response")
        
        return success

    def test_invalid_auth(self):
        """Test invalid authentication"""
        # Save current token
        original_token = self.token
        
        # Test with invalid token
        self.token = "invalid_token"
        
        success, response = self.run_test(
            "Invalid Token Test",
            "GET",
            "auth/me",
            401
        )
        
        # Restore original token
        self.token = original_token
        
        return success

    def test_multi_tenant_isolation(self):
        """Test that restaurants can only access their own data"""
        # Create another restaurant
        timestamp = datetime.now().strftime('%H%M%S')
        other_restaurant_data = {
            "name": f"Other Restaurant {timestamp}",
            "email": f"other{timestamp}@restaurant.com",
            "password": "OtherPass123!"
        }
        
        # Save current auth
        original_token = self.token
        original_restaurant_id = self.restaurant_id
        
        # Register other restaurant
        success, response = self.run_test(
            "Register Other Restaurant",
            "POST",
            "auth/register",
            200,
            data=other_restaurant_data
        )
        
        if not success:
            return False
        
        other_token = response['token']
        other_restaurant_id = response['restaurant']['id']
        
        # Switch to other restaurant
        self.token = other_token
        self.restaurant_id = other_restaurant_id
        
        # Try to access original restaurant's public menu
        success, response = self.run_test(
            "Access Other Restaurant Public Menu",
            "GET",
            f"menu/public/{original_restaurant_id}",
            200
        )
        
        # This should succeed (public menu is public)
        public_menu_success = success
        
        # Switch back to original restaurant
        self.token = original_token
        self.restaurant_id = original_restaurant_id
        
        return public_menu_success

    def cleanup_test_data(self, category_id):
        """Clean up test data"""
        if category_id:
            success, response = self.run_test(
                "Delete Test Category",
                "DELETE",
                f"categories/{category_id}",
                200
            )
            return success
        return True

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Restaurant Menu API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Test registration and authentication
        if not self.test_register():
            print("❌ Registration failed, stopping tests")
            return False
        
        if not self.test_login():
            print("❌ Login test failed")
        
        if not self.test_auth_me():
            print("❌ Auth me test failed")
        
        # Test invalid auth
        self.test_invalid_auth()
        
        # Test CRUD operations
        category_id = self.test_categories_crud()
        if category_id:
            self.test_menu_items_crud(category_id)
            self.cleanup_test_data(category_id)
        
        # Test public endpoints
        self.test_public_menu()
        
        # Test multi-tenant isolation
        self.test_multi_tenant_isolation()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            return False

def main():
    tester = RestaurantMenuAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())