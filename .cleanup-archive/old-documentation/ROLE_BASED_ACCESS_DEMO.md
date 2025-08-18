# CoreTrack v3 - Role-Based Access Control Demo

## How to Test Role-Based Access Control

Since we're in **development mode**, all features are currently unlocked for testing. Here's how the role-based access control works in production:

### User Roles & Permissions

#### 1. **Owner** (Full Access)
- ✅ All permissions (`*`)
- ✅ Can manage users and settings
- ✅ Can access all locations
- ✅ Can perform all operations

#### 2. **Manager** (Limited Administrative Access)
- ✅ Inventory: Read, Create, Update
- ✅ POS: Read, Create
- ✅ Analytics: Read
- ✅ Expenses: Read, Create, Update
- ❌ Cannot delete items
- ❌ Cannot manage users
- ❌ Cannot manage settings

#### 3. **Staff** (Operational Access)
- ✅ Inventory: Read only
- ✅ POS: Read, Create orders
- ✅ Expenses: Read only
- ❌ Cannot edit inventory
- ❌ Cannot delete anything
- ❌ Cannot view analytics

#### 4. **Viewer** (Read-Only Access)
- ✅ Inventory: Read only
- ✅ Analytics: Read only
- ❌ Cannot access POS
- ❌ Cannot modify any data

### Features Implemented

1. **Permission Gates** - Components check permissions before rendering
2. **Role Gates** - UI elements hidden/shown based on user role
3. **Multi-Location Access** - Users can be restricted to specific locations
4. **Team Management** - Invite and manage team members with roles
5. **Location Management** - Create and manage multiple business locations

### Testing in Production Mode

To test role-based access control in production:

1. **Set NODE_ENV to production**:
   ```bash
   NODE_ENV=production npm run dev
   ```

2. **Create test users with different roles**:
   - Sign up as Owner (full access)
   - Invite Manager, Staff, and Viewer users
   - Test each role's access levels

3. **Key Areas to Test**:
   - Inventory Center: Add/Edit/Delete buttons
   - POS: Order processing capabilities
   - Team Management: User invitation and management
   - Location Management: Location creation and editing

### Permission System

The system uses a granular permission model:

- `inventory.read` - View inventory items
- `inventory.create` - Add new inventory items  
- `inventory.update` - Edit inventory items
- `inventory.delete` - Remove inventory items
- `pos.read` - Access POS system
- `pos.create` - Process orders
- `pos.update` - Modify orders
- `users.manage` - Manage team members
- `settings.update` - Modify system settings

### Development Override

In development mode (`NODE_ENV=development`):
- All permission checks return `true`
- All features are accessible regardless of role
- This allows for easy testing and development

### Firebase Index Issue Resolution

The Firebase index error has been resolved by:
1. Removing the `orderBy` clause that caused the composite index requirement
2. Sorting results in memory instead
3. Alternative: Create the required index in Firebase Console using the provided URL

This completes the 100% role-based access control implementation for CoreTrack v3!
