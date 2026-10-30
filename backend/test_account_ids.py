from datetime import datetime, timezone
import unittest
from unittest.mock import patch

from sqlalchemy import Column, Integer, MetaData, Table, create_engine, select
from sqlalchemy.orm import declarative_base, Session

from backend.account_ids import create_id_registry, assign_account_id, install_id_assignment, backfill_account_ids, read_account_id


class AccountIDTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        self.metadata = MetaData()
        self.registry = create_id_registry(self.metadata)
        self.metadata.create_all(self.engine)

    def tearDown(self):
        self.engine.dispose()

    def test_format_leading_zeros_and_saved_id_stays_fixed(self):
        with self.engine.begin() as connection, patch('backend.account_ids.secrets.randbelow', return_value=7):
            code = assign_account_id(connection, self.registry, 'CL', 1, datetime(2026, 10, 30, tzinfo=timezone.utc))
            self.assertEqual(code, 'CL-2026-0007')
            self.assertEqual(assign_account_id(connection, self.registry, 'CL', 1, datetime(2027, 10, 30, tzinfo=timezone.utc)), code)
        with Session(self.engine) as session:
            self.assertEqual(read_account_id(session, self.registry, 'CL', 1), code)

    def test_year_changes_at_manila_new_year_for_both_account_types(self):
        with self.engine.begin() as connection:
            before = assign_account_id(connection, self.registry, 'CL', 1, datetime(2026, 12, 31, 15, 59, tzinfo=timezone.utc))
            after = assign_account_id(connection, self.registry, 'CL', 2, datetime(2026, 12, 31, 16, 0, tzinfo=timezone.utc))
            rider = assign_account_id(connection, self.registry, 'RD', 1, datetime(2027, 1, 1, tzinfo=timezone.utc))
            self.assertRegex(before, r'^CL-2026-\d{4}$')
            self.assertRegex(after, r'^CL-2027-\d{4}$')
            self.assertRegex(rider, r'^RD-2027-\d{4}$')

    def test_collision_retries_without_breaking_the_transaction(self):
        with self.engine.begin() as connection, patch('backend.account_ids.secrets.randbelow', side_effect=[7, 7, 8]):
            self.assertTrue(assign_account_id(connection, self.registry, 'RD', 1).endswith('-0007'))
            self.assertTrue(assign_account_id(connection, self.registry, 'RD', 2).endswith('-0008'))
            self.assertEqual(len(connection.execute(select(self.registry)).all()), 2)

    def test_backfill_is_repeatable_and_new_records_get_ids_on_insert(self):
        base = declarative_base()
        class Clinic(base):
            __tablename__ = 'clinics'
            id = Column(Integer, primary_key=True)
        base.metadata.create_all(self.engine)
        with self.engine.begin() as connection:
            connection.execute(Clinic.__table__.insert(), [{'id': 1}, {'id': 2}])
        accounts = [(Clinic.__table__, 'CL')]
        backfill_account_ids(self.engine, self.registry, accounts)
        with self.engine.connect() as connection:
            original = dict(connection.execute(select(self.registry.c.account_id, self.registry.c.code)).all())
        backfill_account_ids(self.engine, self.registry, accounts)
        install_id_assignment(Clinic, self.registry, 'CL')
        with Session(self.engine) as session:
            session.add(Clinic(id=3))
            session.commit()
            for internal_id, code in original.items():
                self.assertEqual(read_account_id(session, self.registry, 'CL', internal_id), code)
            self.assertRegex(read_account_id(session, self.registry, 'CL', 3), r'^CL-\d{4}-\d{4}$')


if __name__ == '__main__':
    unittest.main()
