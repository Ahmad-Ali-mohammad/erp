from __future__ import annotations

from django.db import transaction

from finance.models import PrintSettings


def get_print_settings() -> PrintSettings:
    settings = PrintSettings.objects.first()
    if settings:
        return settings
    return PrintSettings.objects.create()


def next_invoice_number() -> str:
    with transaction.atomic():
        settings = PrintSettings.objects.select_for_update().first()
        if not settings:
            settings = PrintSettings.objects.create()
        padding = max(int(settings.invoice_padding), 1)
        number = f"{settings.invoice_prefix}{settings.invoice_next_number:0{padding}d}"
        settings.invoice_next_number += 1
        settings.save(update_fields=["invoice_next_number", "updated_at"])
        return number
