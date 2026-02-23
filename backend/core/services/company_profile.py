from __future__ import annotations

from core.models import CompanyProfile


def get_company_profile() -> CompanyProfile:
    profile = CompanyProfile.objects.first()
    if profile:
        return profile
    return CompanyProfile.objects.create()


def get_base_currency() -> str:
    profile = get_company_profile()
    return (profile.base_currency or "KWD").upper()
