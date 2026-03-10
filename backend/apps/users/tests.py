# apps/users/tests.py
"""
Tests para la app users.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import User


class UserModelTest(TestCase):
    """Tests para el modelo User."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            role='aspirante'
        )
    
    def test_create_user(self):
        """Test crear usuario."""
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertTrue(self.user.check_password('testpass123'))
        self.assertEqual(self.user.role, 'aspirante')
    
    def test_create_superuser(self):
        """Test crear superusuario."""
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)
        self.assertEqual(admin.role, 'admin')
    
    def test_user_str(self):
        """Test método __str__."""
        self.assertEqual(str(self.user), 'test@example.com')
    
    def test_role_properties(self):
        """Test propiedades de rol."""
        self.assertTrue(self.user.is_aspirante)
        self.assertFalse(self.user.is_admin)
        self.assertFalse(self.user.is_alumno)


class RegisterAPITest(APITestCase):
    """Tests para el endpoint de registro."""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
    
    def test_register_success(self):
        """Test registro exitoso."""
        data = {
            'email': 'nuevo@example.com',
            'password': 'Password123!',
            'password_confirm': 'Password123!'
        }
        response = self.client.post(self.register_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        
        # Verificar que el usuario fue creado
        user = User.objects.get(email='nuevo@example.com')
        self.assertEqual(user.role, 'aspirante')
        self.assertTrue(user.is_active)
    
    def test_register_password_mismatch(self):
        """Test registro con contraseñas que no coinciden."""
        data = {
            'email': 'nuevo@example.com',
            'password': 'Password123!',
            'password_confirm': 'DifferentPass123!'
        }
        response = self.client.post(self.register_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_register_duplicate_email(self):
        """Test registro con email duplicado."""
        User.objects.create_user(
            email='existing@example.com',
            password='pass123'
        )
        
        data = {
            'email': 'existing@example.com',
            'password': 'Password123!',
            'password_confirm': 'Password123!'
        }
        response = self.client.post(self.register_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginAPITest(APITestCase):
    """Tests para el endpoint de login."""
    
    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('login')
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            role='aspirante'
        )
    
    def test_login_success(self):
        """Test login exitoso."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
    
    def test_login_invalid_credentials(self):
        """Test login con credenciales inválidas."""
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_inactive_user(self):
        """Test login con usuario inactivo."""
        self.user.is_active = False
        self.user.save()
        
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserProfileAPITest(APITestCase):
    """Tests para el endpoint de perfil de usuario."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            role='aspirante'
        )
        self.client.force_authenticate(user=self.user)
        self.profile_url = reverse('user-profile')
    
    def test_get_profile(self):
        """Test obtener perfil."""
        response = self.client.get(self.profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
    
    def test_get_profile_unauthenticated(self):
        """Test obtener perfil sin autenticación."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordAPITest(APITestCase):
    """Tests para cambio de contraseña."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='oldpassword123',
            role='aspirante'
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse('change-password')
    
    def test_change_password_success(self):
        """Test cambio de contraseña exitoso."""
        data = {
            'old_password': 'oldpassword123',
            'new_password': 'NewPassword123!',
            'new_password_confirm': 'NewPassword123!'
        }
        response = self.client.post(self.url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verificar que la contraseña cambió
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassword123!'))
    
    def test_change_password_wrong_old(self):
        """Test cambio de contraseña con contraseña actual incorrecta."""
        data = {
            'old_password': 'wrongpassword',
            'new_password': 'NewPassword123!',
            'new_password_confirm': 'NewPassword123!'
        }
        response = self.client.post(self.url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)