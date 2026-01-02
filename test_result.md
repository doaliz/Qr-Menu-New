#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  QR menü yönetim sistemi - Cafe ve restoran sahipleri için. Super Admin sistemi eklenmesi gerekiyor:
  - Super admin tüm işletmeleri görebilmeli
  - Super admin yeni işletme kaydedebilmeli
  - Manuel lisans aktivasyonu sadece super admin tarafından yapılabilmeli
  - Ödeme sistemi şimdilik devre dışı (Türk ödeme sağlayıcısı sonra eklenecek)

backend:
  - task: "Super Admin - List All Restaurants"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented GET /api/admin/restaurants endpoint. Returns list of all restaurants. Only accessible by super admin."

  - task: "Super Admin - Create Restaurant"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented POST /api/admin/restaurants endpoint. Creates new restaurant with name, email, phone, password. Only accessible by super admin."

  - task: "Super Admin - Manual Subscription"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented POST /api/admin/manual-subscription endpoint. Adds subscription days to a restaurant by email. Only accessible by super admin."

  - task: "Subscription Info with is_super_admin flag"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/subscription/info now returns is_super_admin flag. Super admin check is done by comparing email with SUPER_ADMIN_EMAIL env variable."

frontend:
  - task: "Super Admin Dashboard Page"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/AdminDashboard.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created AdminDashboard page with restaurant list, search, stats cards, and add new restaurant modal. Route protected with SuperAdminRoute."

  - task: "Manual Subscription Page - Super Admin Only"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/ManualSubscription.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added super admin check. Non-super admin users are redirected to dashboard. Route protected with SuperAdminRoute in App.js."

  - task: "Subscription Page - Hide Admin Buttons for Regular Users"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Subscription.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added isSuperAdmin check. Admin Panel and Manuel Lisans Ekle buttons only shown to super admin. Stripe button disabled with 'Yakında Aktif Olacak' message."

  - task: "AuthContext - Super Admin State"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/contexts/AuthContext.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added isSuperAdmin state to AuthContext. Fetches subscription info on login and exposes isSuperAdmin flag to all components."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Super Admin - List All Restaurants"
    - "Super Admin - Create Restaurant"
    - "Super Admin - Manual Subscription"
    - "Super Admin Dashboard Page"
    - "Manual Subscription Page - Super Admin Only"
    - "Subscription Page - Hide Admin Buttons for Regular Users"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implemented Super Admin system. Please test the following:
      
      1. BACKEND TESTS:
         - Create a super admin account with email: admin@qrmenu.com (from SUPER_ADMIN_EMAIL in .env)
         - Test GET /api/admin/restaurants - should return all restaurants (only for super admin)
         - Test POST /api/admin/restaurants - create new restaurant (only for super admin)
         - Test POST /api/admin/manual-subscription - add subscription days (only for super admin)
         - Test that regular users get 403 Forbidden on these endpoints
      
      2. FRONTEND TESTS:
         - Login as super admin (email: admin@qrmenu.com)
         - Go to /subscription page - should see "Admin Panel" and "Manuel Lisans Ekle" buttons
         - Go to /admin page - should see Super Admin Dashboard with restaurant list
         - Test add new restaurant modal
         - Login as regular user - should NOT see admin buttons on /subscription page
         - Regular user should be redirected from /admin and /manual-subscription pages
      
      3. SUPER_ADMIN_EMAIL: admin@qrmenu.com (set in /app/backend/.env)
      
      Note: Stripe payment button is disabled - shows "Yakında Aktif Olacak" message.