from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class CurrencyEnum(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    INR = "INR"


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


class FinancialYearEnum(str, Enum):
    FY_2023_2024 = "2023-2024"
    FY_2024_2025 = "2024-2025"
    FY_2025_2026 = "2025-2026"
    FY_2026_2027 = "2026-2027"
    FY_2027_2028 = "2027-2028"
    FY_2028_2029 = "2028-2029"
    FY_2029_2030 = "2029-2030"
    FY_2030_2031 = "2030-2031"
    FY_2031_2032 = "2031-2032"
    FY_2032_2033 = "2032-2033"
    FY_2033_2034 = "2033-2034"
    FY_2034_2035 = "2034-2035"
    FY_2035_2036 = "2035-2036"
    FY_2036_2037 = "2036-2037"
    FY_2037_2038 = "2037-2038"
    FY_2038_2039 = "2038-2039"
    FY_2039_2040 = "2039-2040"
    FY_2040_2041 = "2040-2041"
    FY_2041_2042 = "2041-2042"
    FY_2042_2043 = "2042-2043"
    FY_2043_2044 = "2043-2044"
    FY_2044_2045 = "2044-2045"
    FY_2045_2046 = "2045-2046"
    FY_2046_2047 = "2046-2047"
    FY_2047_2048 = "2047-2048"
    FY_2048_2049 = "2048-2049"
    FY_2049_2050 = "2049-2050"
    FY_2050_2051 = "2050-2051"
    FY_2051_2052 = "2051-2052"
    FY_2052_2053 = "2052-2053"
    FY_2053_2054 = "2053-2054"
    FY_2054_2055 = "2054-2055"
    FY_2055_2056 = "2055-2056"
    FY_2056_2057 = "2056-2057"
    FY_2057_2058 = "2057-2058"
    FY_2058_2059 = "2058-2059"
    FY_2059_2060 = "2059-2060"
    FY_2060_2061 = "2060-2061"
    FY_2061_2062 = "2061-2062"
    FY_2062_2063 = "2062-2063"
    FY_2063_2064 = "2063-2064"
    FY_2064_2065 = "2064-2065"
    FY_2065_2066 = "2065-2066"
    FY_2066_2067 = "2066-2067"
    FY_2067_2068 = "2067-2068"
    FY_2068_2069 = "2068-2069"
    FY_2069_2070 = "2069-2070"
    FY_2070_2071 = "2070-2071"
    FY_2071_2072 = "2071-2072"
    FY_2072_2073 = "2072-2073"
    FY_2073_2074 = "2073-2074"
    FY_2074_2075 = "2074-2075"
    FY_2075_2076 = "2075-2076"
    FY_2076_2077 = "2076-2077"
    FY_2077_2078 = "2077-2078"
    FY_2078_2079 = "2078-2079"
    FY_2079_2080 = "2079-2080"
    FY_2080_2081 = "2080-2081"
    FY_2081_2082 = "2081-2082"
    FY_2082_2083 = "2082-2083"
    FY_2083_2084 = "2083-2084"
    FY_2084_2085 = "2084-2085"
    FY_2085_2086 = "2085-2086"
    FY_2086_2087 = "2086-2087"
    FY_2087_2088 = "2087-2088"
    FY_2088_2089 = "2088-2089"
    FY_2089_2090 = "2089-2090"
    FY_2090_2091 = "2090-2091"
    FY_2091_2092 = "2091-2092"
    FY_2092_2093 = "2092-2093"
    FY_2093_2094 = "2093-2094"
    FY_2094_2095 = "2094-2095"
    FY_2095_2096 = "2095-2096"
    FY_2096_2097 = "2096-2097"
    FY_2097_2098 = "2097-2098"
    FY_2098_2099 = "2098-2099"
    FY_2099_2100 = "2099-2100"


class TimeZoneEnum(str, Enum):
    UTC = "UTC"
    EST = "EST"
    PST = "PST"
    IST = "IST"
    GMT = "GMT"


# ── Request: Create ──────────────────────────────────────────
class HospitalCreate(BaseModel):
    code:            str
    name:            str
    legalName:       str
    registrationNo:  str
    gstVatNo:        Optional[str] = None
    panTinNo:        Optional[str] = None
    contactNumber:   str
    alternateNumber: Optional[str] = None
    email:           EmailStr
    website:         Optional[str] = None
    address1:        str
    address2:        Optional[str] = None
    country:         str
    state:           str
    city:            str
    postalCode:      str
    currency:        CurrencyEnum = CurrencyEnum.USD
    financialYear:   FinancialYearEnum = FinancialYearEnum.FY_2023_2024
    timeZone:        TimeZoneEnum = TimeZoneEnum.UTC
    status:          StatusEnum   = StatusEnum.Active
    remarks:         Optional[str] = None

    @field_validator("code", "name", "legalName", "registrationNo",
                     "contactNumber", "address1", "country", "state",
                     "city", "postalCode")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()


# ── Request: Update ──────────────────────────────────────────
class HospitalUpdate(BaseModel):
    name:            str
    legalName:       str
    registrationNo:  str
    gstVatNo:        Optional[str] = None
    panTinNo:        Optional[str] = None
    contactNumber:   str
    alternateNumber: Optional[str] = None
    email:           EmailStr
    website:         Optional[str] = None
    address1:        str
    address2:        Optional[str] = None
    country:         str
    state:           str
    city:            str
    postalCode:      str
    currency:        CurrencyEnum = CurrencyEnum.USD
    financialYear:   FinancialYearEnum = FinancialYearEnum.FY_2023_2024
    timeZone:        TimeZoneEnum = TimeZoneEnum.UTC
    status:          StatusEnum   = StatusEnum.Active
    remarks:         Optional[str] = None


# ── Response ─────────────────────────────────────────────────
class HospitalResponse(BaseModel):
    id:              int
    code:            str
    name:            str
    legalName:       str
    registrationNo:  str
    gstVatNo:        Optional[str]
    panTinNo:        Optional[str]
    contactNumber:   str
    alternateNumber: Optional[str]
    email:           str
    website:         Optional[str]
    address1:        str
    address2:        Optional[str]
    country:         str
    state:           str
    city:            str
    postalCode:      str
    currency:        str
    financialYear:   str
    timeZone:        str
    status:          str
    remarks:         Optional[str]
    createdDate:     Optional[datetime]
    modifiedDate:    Optional[datetime]

    class Config:
        from_attributes = True


class HospitalOptionsResponse(BaseModel):
    currencies: list[str]
    financialYears: list[str]
    timeZones: list[str]
    statuses: list[str]
