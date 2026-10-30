"""Persistent public IDs, independent of numeric database keys."""
from datetime import datetime, timedelta, timezone
import secrets

from sqlalchemy import Column, Integer, String, Table, UniqueConstraint, event, select
from sqlalchemy.exc import IntegrityError

MANILA = timezone(timedelta(hours=8))


def create_id_registry(metadata):
    return Table(
        'account_public_ids', metadata,
        Column('id', Integer, primary_key=True),
        Column('account_type', String(2), nullable=False),
        Column('account_id', Integer, nullable=False),
        Column('code', String(12), nullable=False, unique=True),
        UniqueConstraint('account_type', 'account_id', name='uq_public_account_owner'),
    )


def assign_account_id(connection, registry, prefix, account_id, at=None):
    if prefix not in ('CL', 'RD'):
        raise ValueError('Unsupported account type')
    owner = (registry.c.account_type == prefix) & (registry.c.account_id == account_id)
    existing = connection.execute(select(registry.c.code).where(owner)).scalar_one_or_none()
    if existing:
        return existing
    instant = at or datetime.now(MANILA)
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=timezone.utc)
    year = instant.astimezone(MANILA).year
    for _ in range(100):
        code = f'{prefix}-{year}-{secrets.randbelow(10000):04d}'
        try:
            with connection.begin_nested():
                connection.execute(registry.insert().values(account_type=prefix, account_id=account_id, code=code))
            return code
        except IntegrityError:
            # Another worker may have assigned this account, or picked this code.
            existing = connection.execute(select(registry.c.code).where(owner)).scalar_one_or_none()
            if existing:
                return existing
    raise RuntimeError('Could not allocate an account ID. Please try again.')


def install_id_assignment(model, registry, prefix):
    def after_insert(mapper, connection, target):
        assign_account_id(connection, registry, prefix, target.id)
    event.listen(model, 'after_insert', after_insert)


def backfill_account_ids(engine, registry, accounts):
    with engine.begin() as connection:
        for table, prefix in accounts:
            ids = connection.execute(select(table.c.id).order_by(table.c.id)).scalars().all()
            for account_id in ids:
                assign_account_id(connection, registry, prefix, account_id)


def read_account_id(session, registry, prefix, account_id):
    return session.execute(select(registry.c.code).where(
        registry.c.account_type == prefix, registry.c.account_id == account_id
    )).scalar_one()
