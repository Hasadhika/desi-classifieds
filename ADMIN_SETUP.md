# Admin Setup Instructions

## Initial Admin Account Setup

To set up the initial admin account for **ram@ncplconsulting.net**, follow these steps:

### Step 1: Create the Admin Account

1. Open `setup-admin.html` in your browser
2. Click the "Create Admin Account" button
3. The system will create an admin account with:
   - **Email**: ram@ncplconsulting.net
   - **Password**: NCPL@1234

### Step 2: Login

1. Navigate to `/Login` in your application
2. Use the credentials above to login
3. You will now have full admin access

## Admin Features

Once logged in as admin, you can access the Admin Dashboard at `/AdminDashboard` with the following features:

### 1. User Management
- View all registered users
- Promote users to admin (maximum 3 admins allowed)
- Demote admins back to regular users
- Delete user accounts
- Search users by email or name

### 2. Listings Management
- View all listings (active, pending, rejected)
- Approve pending listings
- Reject spam or inappropriate listings
- Search listings by title

### 3. Reports Management
- View user-reported listings
- Resolve or dismiss reports
- Track spam and abuse reports

### 4. Payments & Subscriptions
- View payment transactions
- Monitor active subscriptions
- Track revenue and payment status
- Export payment data

### 5. Category Management
- Manage listing categories
- Add/edit/delete categories
- Configure category fields

## Security Features

- Row Level Security (RLS) enabled on profiles table
- Only admins can modify user roles
- Users cannot change their own role
- Admin limit enforced (max 3 admins)
- Secure password authentication via Supabase

## Database Schema

The following tables are used for admin functionality:

- `profiles` - User profiles with role information
- `listings` - All classified listings
- `reports` - User-submitted spam/abuse reports
- `categories` - Listing categories
- `payments` - Payment transactions (when integrated)
- `subscriptions` - User subscriptions (when integrated)

## Important Notes

1. **Change Default Password**: After first login, ram@ncplconsulting.net should change their password through the profile settings
2. **Admin Limit**: The system enforces a maximum of 3 admins for security
3. **Self-Protection**: Admins cannot demote or delete their own account
4. **RLS Policies**: All data access is controlled by Row Level Security policies in Supabase

## Troubleshooting

If you encounter any issues:

1. Verify Supabase is properly configured in `.env`
2. Check that the `create-admin` Edge Function is deployed
3. Ensure RLS policies are applied to the profiles table
4. Verify the admin user was created in the Supabase dashboard

For further assistance, contact the development team.
