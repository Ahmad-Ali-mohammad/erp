from __future__ import annotations

from django.db import transaction

from core.models import Sequence

DEFAULT_SEQUENCE_CONFIG = {
    "customer": {"prefix": "CUST-", "padding": 5},
    "purchase_request": {"prefix": "PR-", "padding": 5},
    "purchase_order": {"prefix": "PO-", "padding": 5},
    "change_order": {"prefix": "CO-", "padding": 5},
    "real_estate_project": {"prefix": "RE-", "padding": 4},
    "sales_contract": {"prefix": "SC-", "padding": 5},
    "reservation": {"prefix": "RSV-", "padding": 5},
    "installment": {"prefix": "INST-", "padding": 5},
    "subcontract": {"prefix": "SUB-", "padding": 5},
}


def next_sequence(key: str, *, prefix: str | None = None, padding: int | None = None, suffix: str | None = None) -> str:
    config = DEFAULT_SEQUENCE_CONFIG.get(key, {})
    default_prefix = prefix if prefix is not None else config.get("prefix", "")
    default_padding = padding if padding is not None else config.get("padding", 4)
    default_suffix = suffix if suffix is not None else config.get("suffix", "")

    with transaction.atomic():
        sequence, created = Sequence.objects.select_for_update().get_or_create(
            key=key,
            defaults={
                "prefix": default_prefix,
                "padding": default_padding,
                "suffix": default_suffix,
            },
        )
        if not created:
            updated = False
            if prefix is not None and sequence.prefix != prefix:
                sequence.prefix = prefix
                updated = True
            if padding is not None and sequence.padding != padding:
                sequence.padding = padding
                updated = True
            if suffix is not None and sequence.suffix != suffix:
                sequence.suffix = suffix
                updated = True
            if updated:
                sequence.save(update_fields=["prefix", "padding", "suffix", "updated_at"])

        current_number = sequence.next_number
        sequence.next_number = current_number + 1
        sequence.save(update_fields=["next_number", "updated_at"])

    padded = str(current_number).zfill(sequence.padding)
    return f"{sequence.prefix}{padded}{sequence.suffix}"
