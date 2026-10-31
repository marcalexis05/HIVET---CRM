"""Field validation without changing the stored catalog or account schema."""
import json
import re
import unicodedata
from decimal import Decimal, InvalidOperation


def validate_person_name(value):
    name = (value or '').strip()
    if name and (not any(c.isalpha() for c in name) or any(
            not (unicodedata.category(c)[0] in {'L', 'M'} or c == ' ') for c in name)):
        raise ValueError('Names may contain letters and spaces only.')
    return name


def validate_weight(value):
    if value is None or not str(value).strip():
        return value
    value = str(value).strip()
    if not re.fullmatch(r'(?:\d+(?:\.\d+)?|\.\d+)', value):
        raise ValueError('Weight must be a non-negative number, for example 2.4.')
    return value


def nonnegative(value, label, integer=False):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError(f'{label} must be a non-negative number.')
    if not number.is_finite() or number < 0 or (integer and number != number.to_integral_value()):
        raise ValueError(f'{label} must be a non-negative {"whole number" if integer else "number"}.')
    return value


def validate_catalog_json(value, kind):
    if value is None or value == '':
        return value
    try:
        rows = json.loads(value) if isinstance(value, str) else value
    except (TypeError, ValueError):
        raise ValueError(f'Invalid {kind} data.')
    if not isinstance(rows, list):
        raise ValueError(f'{kind} must be a list.')
    for row in rows:
        if not isinstance(row, dict) or not str(row.get('name', '')).strip():
            raise ValueError(f'Each {kind} entry needs a name.')
        if row.get('price') not in (None, ''):
            nonnegative(row['price'], 'Price')
        if row.get('stock') not in (None, ''):
            nonnegative(row['stock'], 'Stock', True)
        if 'sizes' in row:
            validate_catalog_json(row['sizes'], 'sizes')
        for branch in (row.get('branch_stock') or {}).values():
            if isinstance(branch, dict):
                if branch.get('price') not in (None, ''):
                    nonnegative(branch['price'], 'Branch price')
                if branch.get('stock') not in (None, ''):
                    nonnegative(branch['stock'], 'Branch stock', True)
    return value


def validate_distribution(value):
    if value is None:
        return value
    for branch in value.values():
        if isinstance(branch, dict):
            if branch.get('price') not in (None, ''):
                nonnegative(branch['price'], 'Branch price')
            if branch.get('stock') not in (None, ''):
                nonnegative(branch['stock'], 'Branch stock', True)
        else:
            nonnegative(branch, 'Branch stock', True)
    return value
