# apps/payments/generators.py
from django.utils import timezone


def generate_reference_number():
    """
    Genera un número de referencia único con formato PAY-YYYYMMDD-XXXX.
    El sufijo es secuencial por día para evitar colisiones.
    """
    from apps.payments.models import Payment

    today = timezone.localdate()
    date_str = today.strftime('%Y%m%d')
    prefix = f'PAY-{date_str}-'

    last = (
        Payment.objects.filter(reference_number__startswith=prefix)
        .order_by('-reference_number')
        .values_list('reference_number', flat=True)
        .first()
    )

    if last:
        try:
            seq = int(last.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1

    return f'{prefix}{seq:04d}'
