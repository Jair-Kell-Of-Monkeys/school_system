import mailtrap as mt
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings


class MailtrapSandboxBackend(BaseEmailBackend):
    def open(self):
        return True

    def close(self):
        pass

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        sent = 0
        client = mt.MailtrapClient(
            token=settings.MAILTRAP_API_TOKEN,
            sandbox=True,
            inbox_id=settings.MAILTRAP_INBOX_ID
        )
        for message in email_messages:
            try:
                html_body = None
                for content, mimetype in getattr(message, 'alternatives', []):
                    if mimetype == 'text/html':
                        html_body = content
                        break
                mail = mt.Mail(
                    sender=mt.Address(email="noreply@universidad.edu.mx",
                                      name="Sistema Universitario"),
                    to=[mt.Address(email=recipient) for recipient in message.to],
                    subject=message.subject,
                    text=message.body,
                    html=html_body or message.body,
                )
                client.send(mail)
                sent += 1
            except Exception as e:
                if not self.fail_silently:
                    raise
        return sent
