import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("=== Users in Database ===")
users = User.objects.all()
for user in users:
    print(f"Username: {user.username}, Email: {user.email}, Active: {user.is_active}")

print(f"\nTotal users: {users.count()}")

# Try to create admin user if doesn't exist
if not User.objects.filter(username='admin').exists():
    print("\nCreating admin user...")
    User.objects.create_superuser('admin', 'admin@example.com', 'Admin@12345')
    print("Admin user created!")
