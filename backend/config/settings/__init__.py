# config/settings/__init__.py
"""
Selecciona automáticamente la configuración según el entorno.
- RAILWAY_ENVIRONMENT definida → producción
- En otro caso → desarrollo
"""

import os

if os.environ.get('RAILWAY_ENVIRONMENT'):
    from .production import *
else:
    from .development import *