"""Exercise the real pet routes with an isolated in-memory database.

Load only the needed definitions so tests never start background jobs or touch
the configured application database when importing the large server module.
"""
import ast
from datetime import datetime
from pathlib import Path
import unittest

import sqlalchemy as sa
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.testclient import TestClient
from jose import jwt, JWTError
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PetProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = sa.create_engine('sqlite://', poolclass=StaticPool, connect_args={'check_same_thread': False})
        cls.session = sessionmaker(bind=cls.engine)
        base = declarative_base()
        sa.Table('business_services', base.metadata, sa.Column('id', sa.Integer, primary_key=True))

        def get_db():
            with cls.session() as db:
                yield db

        app = FastAPI()
        cls.scope = {
            **vars(sa), 'Base': base, 'Session': Session, 'datetime': datetime,
            'BaseModel': BaseModel, 'ConfigDict': ConfigDict, 'Field': Field,
            'field_validator': field_validator, 'app': app, 'Depends': Depends,
            'HTTPException': HTTPException, 'Request': Request, 'get_db': get_db,
            'IntegrityError': sa.exc.IntegrityError, 'JWTError': JWTError,
            'decode_token': lambda token: jwt.decode(token, 'pet-test-secret', algorithms=['HS256'])
        }
        wanted = {
            'contains_profanity', 'Customer', 'PetProfile', 'Reservation',
            'get_current_user', 'PetProfileCreate', 'customer_pet_profiles',
            'pet_profile_customer_id', 'get_my_pets', 'create_my_pet'
        }
        tree = ast.parse(Path(__file__).with_name('main.py').read_text(encoding='utf-8'))
        definitions = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name in wanted]
        assert len(definitions) == len(wanted)
        exec(compile(ast.Module(body=definitions, type_ignores=[]), 'main.py', 'exec'), cls.scope)
        cls.base = base
        cls.client = TestClient(app)

    def setUp(self):
        self.base.metadata.drop_all(self.engine)
        self.base.metadata.create_all(self.engine)
        with self.session() as db:
            db.add_all([self.scope['Customer'](id=1, email='one@example.test'), self.scope['Customer'](id=2, email='two@example.test')])
            db.commit()

    @staticmethod
    def auth(customer_id=1, role='customer'):
        return {'Authorization': 'Bearer ' + jwt.encode({'sub': str(customer_id), 'role': role}, 'pet-test-secret', algorithm='HS256')}

    def test_save_and_reload_without_booking(self):
        response = self.client.post('/api/customers/me/pets', headers=self.auth(), json={'name': '  Max  ', 'type': 'dog', 'breed': '  Labrador '})
        self.assertEqual(response.status_code, 201, response.text)
        expected = {'name': 'Max', 'type': 'Dog', 'breed': 'Labrador'}
        self.assertEqual(response.json()['pet'], expected)
        self.assertEqual(self.client.get('/api/customers/me/pets', headers=self.auth()).json()['pets'], [expected])
        self.assertEqual(self.client.get('/api/customers/me/pets', headers=self.auth(2)).json()['pets'], [])

    def test_existing_customer_token_role_is_supported(self):
        response = self.client.post('/api/customers/me/pets', headers=self.auth(role='user'), json={'name': 'Max', 'type': 'Dog'})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(len(self.client.get('/api/customers/me/pets', headers=self.auth(role='user')).json()['pets']), 1)

    def test_duplicate_name_and_customer_isolation(self):
        pet = {'name': 'Max', 'type': 'Dog'}
        self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(), json=pet).status_code, 201)
        self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(), json={**pet, 'name': ' max '}).status_code, 409)
        self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(2), json=pet).status_code, 201)

    def test_invalid_or_unauthorized_requests(self):
        pet = {'name': 'Max', 'type': 'Dog'}
        self.assertEqual(self.client.post('/api/customers/me/pets', json=pet).status_code, 401)
        for role in ('business', 'rider', 'super_admin'):
            self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(role=role), json=pet).status_code, 403)
        self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(99), json=pet).status_code, 404)
        for invalid in ({'name': ' ', 'type': 'Dog'}, {'name': 'x'*81, 'type': 'Dog'}, {'name': 'Max', 'type': 'Invalid'}, {'name': 'Max', 'type': 'Dog', 'breed': 'x'*101}):
            self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(), json=invalid).status_code, 422)

    def test_legacy_bookings_remain_visible_without_duplicates_or_truncation(self):
        with self.session() as db:
            db.add(self.scope['Reservation'](customer_id=1, pet_name='Max', pet_type='Dog', pet_breed='Labrador', service='Visit', date='2026-10-30', time='10:00 AM'))
            db.commit()
        self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(), json={'name': 'max', 'type': 'Dog'}).status_code, 409)
        for name in ('Milo', 'Luna', 'Bella', 'Coco'):
            self.assertEqual(self.client.post('/api/customers/me/pets', headers=self.auth(), json={'name': name, 'type': 'Cat'}).status_code, 201)
        pets = self.client.get('/api/customers/me/pets', headers=self.auth()).json()['pets']
        self.assertEqual(len(pets), 5)
        self.assertIn({'name': 'Max', 'type': 'Dog', 'breed': 'Labrador'}, pets)


if __name__ == '__main__':
    unittest.main()
