from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from .models import ProjectCostRecord


def upsert_project_cost_record(
    *,
    project,
    cost_code,
    record_type: str,
    amount: Decimal,
    record_date,
    source_module: str,
    source_reference: str,
    created_by=None,
    notes: str = "",
):
    if not project or not cost_code:
        return None

    cost_record, created = ProjectCostRecord.objects.get_or_create(
        project=project,
        cost_code=cost_code,
        record_type=record_type,
        source_module=source_module,
        source_reference=source_reference,
        defaults={
            "amount": amount,
            "record_date": record_date,
            "created_by": created_by,
            "notes": notes,
        },
    )
    if created:
        return cost_record

    fields_to_update = []
    if cost_record.amount != amount:
        cost_record.amount = amount
        fields_to_update.append("amount")
    if cost_record.record_date != record_date:
        cost_record.record_date = record_date
        fields_to_update.append("record_date")
    if notes and cost_record.notes != notes:
        cost_record.notes = notes
        fields_to_update.append("notes")
    if created_by and cost_record.created_by_id is None:
        cost_record.created_by = created_by
        fields_to_update.append("created_by")

    if fields_to_update:
        fields_to_update.append("updated_at")
        cost_record.save(update_fields=fields_to_update)
    return cost_record


def settle_project_cost_records_by_source(
    *,
    record_type: str,
    source_module: str,
    source_reference: str,
):
    ProjectCostRecord.objects.filter(
        record_type=record_type,
        source_module=source_module,
        source_reference=source_reference,
    ).exclude(amount=Decimal("0.00")).update(amount=Decimal("0.00"), updated_at=timezone.now())


def sync_project_cost_records_by_source(
    *,
    project,
    record_type: str,
    source_module: str,
    source_reference: str,
    record_date,
    created_by=None,
    amount_by_cost_code: dict | None = None,
    notes_prefix: str = "",
):
    if not project:
        settle_project_cost_records_by_source(
            record_type=record_type,
            source_module=source_module,
            source_reference=source_reference,
        )
        return

    amount_by_cost_code = amount_by_cost_code or {}
    synced_cost_code_ids = set()
    for cost_code, amount in amount_by_cost_code.items():
        if not cost_code:
            continue
        upsert_project_cost_record(
            project=project,
            cost_code=cost_code,
            record_type=record_type,
            amount=amount,
            record_date=record_date,
            source_module=source_module,
            source_reference=source_reference,
            created_by=created_by,
            notes=f"{notes_prefix}{source_reference}".strip(),
        )
        synced_cost_code_ids.add(cost_code.id)

    stale_records = ProjectCostRecord.objects.filter(
        project=project,
        record_type=record_type,
        source_module=source_module,
        source_reference=source_reference,
    )
    if synced_cost_code_ids:
        stale_records = stale_records.exclude(cost_code_id__in=synced_cost_code_ids)
    stale_records.exclude(amount=Decimal("0.00")).update(amount=Decimal("0.00"), updated_at=timezone.now())
