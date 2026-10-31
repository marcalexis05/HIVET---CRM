"""Run the actual changed route definitions against an isolated SQLite database.

Do not import main: its startup connects to the application's configured database.
External SMS, email and payment services are replaced with deterministic test doubles.
"""
import ast
import io
import json
from order_actions import customer_action_window
from refund_evidence import save_evidence, evidence_path, validate_evidence
import tempfile
from PIL import Image
from unittest.mock import patch
import delivery_proofs
from delivery_proofs import *
import asyncio
import base64
from datetime import datetime, timedelta
from pathlib import Path
import random
import unittest
from typing import Optional, List
from unittest.mock import Mock
import urllib.parse
from types import SimpleNamespace

import sqlalchemy as sa
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, FileResponse
from starlette.concurrency import run_in_threadpool
from fastapi.testclient import TestClient
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256
from pydantic import BaseModel, Field, field_validator, ConfigDict, ValidationError
import httpx

from order_references import format_order_reference, compact_order_references_in_text, mask_pickup_serial
from auth_sessions import *
from input_validation import *
from sms_templates import format_order_confirmation_sms, format_reservation_confirmation_sms


class QaRevisionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = sa.create_engine('sqlite://', poolclass=StaticPool, connect_args={'check_same_thread': False})
        cls.factory = sessionmaker(bind=cls.engine)
        cls.base = declarative_base()
        app = FastAPI()
        def get_db():
            with cls.factory() as db:
                yield db
        async def email(**kwargs):
            pass
        cls.sms = Mock(return_value={'success': True})
        cls.scope = {
            **globals(), **vars(sa), 'Base': cls.base, 'app': app, 'get_db': get_db,
            'SessionLocal': cls.factory, 'SECRET_KEY': 'isolated-qa-secret', 'ALGORITHM': 'HS256',
            'TOKEN_EXPIRE_DAYS': 1, 'send_sms': cls.sms, 'EMAIL_SENDER': 'test@example.test',
            'send_bespoke_reservation_email': email, 'contains_profanity': lambda _: False,
            'add_notification': lambda *args, **kwargs: None, 'FRONTEND_URL': 'https://example.test',
            'PAYMONGO_SECRET_KEY': 'test-only', 'get_distance': lambda *args: 1,
            'send_return_request_emails': Mock(), 'calculate_shipping_fee': lambda distance: 50, 'reduce_stock': lambda *args: None,
        }
        tree = ast.parse(Path(__file__).with_name('main.py').read_text(encoding='utf-8'))
        names = {'create_access_token', 'decode_token', 'get_current_user', 'validate_portal_session',
                 'get_checkout_pickup_branches', 'get_public_catalog', 'ProductSchema', 'BranchStockSchema', 'order_product_points', 'previous_order_points', 'order_receipt_details', 'confirm_order_received',
                 'OrderReturnRequest', 'request_order_return', 'upload_refund_photo', 'view_refund_photo',
                 'assigned_delivery', 'upload_delivery_proof', 'view_delivery_proof',
                 'DeliveryStepUpdate', 'BusinessOrderStatusUpdate', 'update_delivery_status', 'update_delivery_status_alias',
                 'get_notifications', 'mark_all_read', 'delete_notification', 'delete_all_notifications', 'update_business_order_status',
                 'get_ongoing_job', 'accept_delivery_task', 'get_business_orders', 'get_orders', 'get_rider_orders_all', 'get_available_jobs',
                 'LoginRequest', 'login_customer', 'login_clinic', 'login_rider', 'login_admin',
                 'authenticate_portal', 'logout_session', 'delete_account', 'delete_platform_user',
                 'RegisterRequest', 'ProductCreate', 'ProductUpdate', 'OrderCreate', 'OrderItemCreate',
                 'ReservationCreate', 'create_order', 'create_paymongo_checkout', 'create_reservation',
                 '_reservation_to_dict', 'queue_customer_sms', 'deliver_customer_sms'}
        definitions = [n for n in tree.body if isinstance(n, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))
                       and (n.name in names or isinstance(n, ast.ClassDef) and any(isinstance(b, ast.Name) and b.id == 'Base' for b in n.bases))]
        exec(compile(ast.Module(body=definitions, type_ignores=[]), 'main.py', 'exec'), cls.scope)
        for role in ('customer', 'business', 'rider'):
            app.add_api_route(f'/api/{role}/qa-protected', lambda: {'ok': True})
        cls.client = TestClient(app)

    def setUp(self):
        self.base.metadata.drop_all(self.engine)
        SessionBase.metadata.drop_all(self.engine)
        self.base.metadata.create_all(self.engine)
        SessionBase.metadata.create_all(self.engine)
        self.proof_temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.proof_temp.cleanup)
        proof_patch = patch.object(delivery_proofs, 'PROOF_DIR', Path(self.proof_temp.name))
        proof_patch.start()
        self.addCleanup(proof_patch.stop)
        self.sms.reset_mock(return_value=True, side_effect=True)
        self.sms.return_value = {'success': True}
        self.password = 'Qa-test-password!'
        self.models = {r: self.scope[n] for r, n in [('customer', 'Customer'), ('business', 'BusinessProfile'),
                       ('rider', 'RiderProfile'), ('super_admin', 'SuperAdminUser'), ('system_admin', 'SystemAdminUser')]}
        with self.factory() as db:
            for role, model in self.models.items():
                args = dict(id=1, email=f'{role}@example.test', password_hash=pbkdf2_sha256.hash(self.password), role=role)
                if role in ('business', 'rider'):
                    args['compliance_status'] = 'verified'
                if role == 'customer':
                    args.update(phone='09171234567', first_name='Juan', last_name='Dela Cruz')
                db.add(model(**args))
            db.commit()

    def login(self, role, portal=None, password=None, extra=None):
        return self.client.post('/api/auth/login/' + (portal or ('clinic' if role == 'business' else 'admin' if role.endswith('admin') else role)),
                                json=dict(email=f'{role}@example.test', password=password or self.password, **(extra or {})))

    def auth(self, role='customer'):
        result = self.login(role)
        self.assertEqual(result.status_code, 200, result.text)
        return {'Authorization': 'Bearer ' + result.json()['token']}

    def session_count(self):
        with self.factory() as db:
            return db.query(AuthSession).count()

    def test_available_deliveries_separate_order_shipping_and_rider_pay(self):
        self.seed_active_delivery()
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            order.status, order.rider_id, order.shipping_fee = 'Processing', None, 75
            delivery = db.get(self.scope['Delivery'], 7)
            delivery.rider_id, delivery.delivery_fee = None, 60
            db.commit()
        response = self.client.get('/api/rider/available-orders', headers=self.auth('rider'))
        self.assertEqual(response.status_code, 200, response.text)
        order = response.json()['orders'][0]
        self.assertEqual((order['total_amount'], order['shipping_fee'], order['delivery_fee']), (100, 75, 60))
        with self.factory() as db:
            db.get(self.scope['Delivery'], 7).delivery_fee = 0
            db.commit()
        order = self.client.get('/api/rider/available-orders', headers=self.auth('rider')).json()['orders'][0]
        self.assertEqual(order['delivery_fee'], 0)

    def seed_active_delivery(self):
        self.seed_catalog()
        with self.factory() as db:
            db.add(self.scope['Order'](id=182, customer_id=1, clinic_id=1, rider_id=1,
                status='Picked Up', total_amount=100, fulfillment_method='delivery', payment_method='cash'))
            db.add(self.scope['Delivery'](id=7, order_id=182, clinic_id=1, rider_id=1,
                status='out_for_delivery', delivery_fee=50))
            db.add(self.scope['OrderItem'](order_id=182, product_id=1, product_name='Food', quantity=1, price=100))
            db.commit()

    def proof_image(self):
        data = io.BytesIO()
        Image.new('RGB', (640, 480), 'orange').save(data, 'JPEG')
        return data.getvalue()

    def test_store_includes_legacy_unarchived_products_but_not_archived_items(self):
        self.seed_catalog()
        with self.factory() as db:
            db.add(self.scope['Product'](id=2, business_id=1, name='Older supply', price=50, stock=24))
            db.add(self.scope['Product'](id=3, business_id=1, name='Archived supply', price=20, stock=3, is_archived=True))
            db.commit()
            db.execute(sa.update(self.scope['Product']).where(self.scope['Product'].id == 2).values(is_archived=None))
            db.commit()
        response = self.client.get('/api/catalog')
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual({row['id'] for row in response.json()}, {1, 2})

    def test_customer_action_window_expires_at_exactly_72_hours_from_delivery(self):
        delivered = datetime(2026, 10, 1, 9)
        order = SimpleNamespace(status='Completed', delivered_at=delivered, created_at=delivered-timedelta(days=10), return_status=None)
        before = customer_action_window(order, delivered + timedelta(hours=72) - timedelta(seconds=1))
        self.assertFalse(before['customer_action_expired'])
        self.assertTrue(before['can_request_return'])
        at_deadline = customer_action_window(order, delivered + timedelta(hours=72))
        self.assertTrue(at_deadline['customer_action_expired'])
        self.assertFalse(at_deadline['can_request_return'])
        # An old creation date does not shorten the period when delivery time is available.
        self.assertFalse(customer_action_window(order, delivered + timedelta(hours=1))['customer_action_expired'])
        order.delivered_at = None
        self.assertTrue(customer_action_window(order, delivered + timedelta(hours=1))['customer_action_expired'])

    def test_expired_order_blocks_receipt_refund_and_refund_photo_upload(self):
        self.seed_active_delivery()
        headers = self.auth()
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            order.status, order.delivered_at = 'Completed', datetime.utcnow()
            db.commit()
        photo = self.client.post('/api/orders/refund/upload', headers=headers, data={'order_id': 182}, files={'file': ('photo.jpg', self.proof_image(), 'image/jpeg')})
        self.assertEqual(photo.status_code, 200, photo.text)
        with self.factory() as db:
            db.get(self.scope['Order'], 182).delivered_at = datetime.utcnow()-timedelta(days=3)
            db.commit()
        order = self.client.get('/api/orders', headers=headers).json()['orders'][0]
        self.assertTrue(order['customer_action_expired'])
        self.assertFalse(order['can_confirm_received'])
        self.assertFalse(order['can_request_return'])
        self.assertEqual(self.client.post('/api/orders/182/received', headers=headers).status_code, 400)
        self.assertEqual(self.client.post('/api/orders/182/return', headers=headers, json={'reason': 'The supply arrived damaged.', 'photos': [photo.json()['url']]}).status_code, 400)
        self.assertEqual(self.client.post('/api/orders/refund/upload', headers=headers, data={'order_id': 182}, files={'file': ('new.jpg', self.proof_image(), 'image/jpeg')}).status_code, 400)
        with self.factory() as db:
            self.assertEqual(db.query(self.scope['CustomerOrderReceipt']).count(), 0)
            self.assertEqual(db.query(self.scope['ReturnRequest']).count(), 0)
            self.assertEqual(db.get(self.scope['Customer'], 1).loyalty_points, 0)

    def test_order_received_awards_product_points_once_and_only_after_delivery(self):
        self.seed_active_delivery()
        customer = self.auth()
        with self.factory() as db:
            db.query(self.scope['OrderItem']).first().loyalty_points = 12
            db.query(self.scope['OrderItem']).first().quantity = 2
            db.commit()
        # Being in transit never permits claiming points.
        self.assertEqual(self.client.post('/api/orders/182/received', headers=customer).status_code, 400)
        with self.factory() as db:
            db.get(self.scope['Order'], 182).status = 'Completed'
            db.commit()
        before = self.client.get('/api/orders', headers=customer).json()['orders'][0]
        self.assertTrue(before['can_confirm_received'])
        self.assertIsNone(before['customer_received_at'])
        response = self.client.post('/api/orders/182/received', headers=customer)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['points_awarded'], 24)
        self.assertTrue(response.json()['customer_received_at'])
        self.assertEqual(self.client.post('/api/orders/182/received', headers=customer).json()['points_awarded'], 0)
        refreshed = self.client.get('/api/orders', headers=customer).json()['orders'][0]
        self.assertFalse(refreshed['can_confirm_received'])
        self.assertTrue(refreshed['customer_received_at'])
        with self.factory() as db:
            self.assertEqual(db.get(self.scope['Customer'], 1).loyalty_points, 24)
            self.assertEqual(db.query(self.scope['CustomerOrderReceipt']).count(), 1)
            self.assertEqual(db.query(self.scope['LoyaltyHistory']).count(), 1)
            self.assertEqual(db.get(self.scope['Order'], 182).status, 'Completed')

    def test_clinic_pickup_completion_also_waits_for_customer_receipt(self):
        self.seed_active_delivery()
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            order.fulfillment_method, order.status = 'pickup', 'Processing'
            db.query(self.scope['OrderItem']).first().loyalty_points = 7
            db.commit()
        response = self.client.patch('/api/business/orders/182/status', headers=self.auth('business'), json={'status': 'Completed'})
        self.assertEqual(response.status_code, 200, response.text)
        with self.factory() as db:
            self.assertEqual(db.get(self.scope['Customer'], 1).loyalty_points, 0)
        received = self.client.post('/api/orders/182/received', headers=self.auth())
        self.assertEqual(received.status_code, 200, received.text)
        self.assertEqual(received.json()['points_awarded'], 7)

    def test_receipt_with_no_product_points_or_legacy_award_does_not_add_unearned_points(self):
        self.seed_active_delivery()
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            order.status = 'Completed'
            db.commit()
        response = self.client.post('/api/orders/182/received', headers=self.auth())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['points_awarded'], 0)
        with self.factory() as db:
            db.delete(db.get(self.scope['CustomerOrderReceipt'], 182))
            db.query(self.scope['OrderItem']).first().loyalty_points = 10
            order = db.get(self.scope['Order'], 182)
            db.add(self.scope['LoyaltyHistory'](customer_id=1, description=f"Earned points from Order HV-{order.created_at.year}-{order.id:06d}", points=10))
            db.get(self.scope['Customer'], 1).loyalty_points = 10
            db.commit()
        response = self.client.post('/api/orders/182/received', headers=self.auth())
        self.assertEqual(response.json()['points_awarded'], 0)
        with self.factory() as db:
            self.assertEqual(db.get(self.scope['Customer'], 1).loyalty_points, 10)
            self.assertEqual(db.get(self.scope['CustomerOrderReceipt'], 182).previous_points_awarded, 10)

    def test_receipt_cannot_be_claimed_by_another_account_or_during_a_refund(self):
        self.seed_active_delivery()
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            order.status, order.return_status = 'Completed', 'Requested'
            db.commit()
        self.assertEqual(self.client.post('/api/orders/182/received', headers=self.auth()).status_code, 400)
        self.assertEqual(self.client.post('/api/orders/182/received', headers=self.auth('rider')).status_code, 403)
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            order.customer_id, order.return_status = 2, None
            db.commit()
        self.assertEqual(self.client.post('/api/orders/182/received', headers=self.auth()).status_code, 404)

    def test_refund_requires_a_valid_reason_and_owned_supply_photos(self):
        self.seed_active_delivery()
        headers = self.auth()
        # Evidence is only uploaded for a delivered order owned by the signed-in customer.
        def upload(order_id=182, content=None, auth=None):
            return self.client.post('/api/orders/refund/upload', headers=auth or headers, data={'order_id': order_id}, files={'file': ('photo.jpg', self.proof_image() if content is None else content, 'image/jpeg')})
        self.assertEqual(upload().status_code, 400)
        with self.factory() as db:
            db.get(self.scope['Order'], 182).status = 'Completed'
            db.commit()
        self.assertEqual(upload(999).status_code, 404)
        self.assertEqual(upload(content=b'not an image').status_code, 400)
        photo = upload()
        self.assertEqual(photo.status_code, 200, photo.text)
        url = photo.json()['url']
        reason = 'The supply arrived damaged and the seal is broken.'
        for data in [{'reason': ' ', 'photos': [url]}, {'reason': 'bad', 'photos': [url]}, {'reason': reason, 'photos': []}, {'reason': reason, 'photos': ['https://example.test/unrelated.jpg']}, {'reason': reason, 'photos': [url, url]}, {'reason': reason, 'photos': [url.replace('/182/', '/183/')]}]:
            self.assertIn(self.client.post('/api/orders/182/return', headers=headers, json=data).status_code, [400, 422])
        self.assertEqual(self.client.get(url, headers=headers).status_code, 200)
        self.assertEqual(self.client.get(url, headers=self.auth('business')).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 401)
        with self.factory() as db:
            db.add(self.scope['Order'](id=183, customer_id=1, clinic_id=1, status='Completed', fulfillment_method='delivery', payment_method='cash', total_amount=100))
            db.commit()
        other_photo = upload(183).json()['url']
        self.assertEqual(self.client.post('/api/orders/182/return', headers=headers, json={'reason': reason, 'photos': [other_photo]}).status_code, 400)
        result = self.client.post('/api/orders/182/return', headers=headers, json={'reason': reason, 'photos': [url]})
        self.assertEqual(result.status_code, 200, result.text)
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            self.assertEqual(order.return_status, 'Requested')
            self.assertEqual(json.loads(order.return_photos), [url])
            self.assertEqual(db.query(self.scope['ReturnRequest']).count(), 1)
        self.assertEqual(self.client.post('/api/orders/182/return', headers=headers, json={'reason': reason, 'photos': [url]}).status_code, 200)
        with self.factory() as db:
            self.assertEqual(db.query(self.scope['ReturnRequest']).count(), 1)

    def test_rider_payload_masks_serial_and_never_discloses_pickup_pin(self):
        self.seed_active_delivery()
        serial = 'HV-SN-182-1-1183'
        with self.factory() as db:
            order = db.get(self.scope['Order'], 182)
            order.status, order.rider_id = 'Processing', None
            delivery = db.get(self.scope['Delivery'], 7)
            delivery.status, delivery.rider_id, delivery.pickup_pin = 'pending_pickup', None, '4321'
            db.query(self.scope['OrderItem']).first().serial_number = serial
            db.commit()
        headers = self.auth('rider')
        accepted = self.client.post('/api/rider/tasks/7/accept', headers=headers)
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertNotIn('pickup_pin', accepted.json())
        rider = self.client.get('/api/rider/active-order', headers=headers)
        self.assertEqual(rider.status_code, 200, rider.text)
        self.assertNotIn(serial, rider.text)
        self.assertNotIn('4321', rider.text)
        self.assertEqual(rider.json()['order']['primary_serial_number'], 'HV-SN-***-*-****')
        clinic = self.client.get('/api/business/orders', headers=self.auth('business')).json()[0]
        self.assertEqual(clinic['serial_number'], serial)
        self.assertEqual(clinic['pickup_pin'], '4321')
        for code in ['HV-SN-***-*-****', 'incorrect', '4321']:
            self.assertEqual(self.client.patch('/api/rider/tasks/7/status', headers=headers, json={'status': 'Picked Up', 'pin': code}).status_code, 400)
        picked_up = self.client.patch('/api/rider/tasks/7/status', headers=headers, json={'status': 'Picked Up', 'pin': serial})
        self.assertEqual(picked_up.status_code, 200, picked_up.text)

    def test_completion_requires_server_stored_photo_and_verified_pickup(self):
        self.seed_active_delivery()
        headers = self.auth('rider')
        for path in ['/api/rider/deliveries/7/status', '/api/rider/tasks/7/status']:
            result = self.client.patch(path, json={'new_status': 'Delivered', 'proof_of_delivery_url': 'https://example.test/fake.jpg'}, headers=headers)
            self.assertEqual(result.status_code, 400, result.text)
        with self.factory() as db:
            self.assertEqual(db.get(self.scope['Order'], 182).status, 'Picked Up')
            self.assertEqual(db.get(self.scope['Delivery'], 7).status, 'out_for_delivery')
            self.assertEqual(db.query(self.scope['RiderWallet']).count(), 0)
        # The clinic cannot bypass the rider proof workflow.
        result = self.client.patch('/api/business/orders/182/status', json={'status': 'Completed'}, headers=self.auth('business'))
        self.assertEqual(result.status_code, 400, result.text)

    def test_photo_upload_validates_bytes_and_assignment_and_preserves_state_on_failure(self):
        self.seed_active_delivery()
        headers = self.auth('rider')
        for content in [b'not an image', b'', b'X' * (8 * 1024 * 1024 + 1)]:
            result = self.client.post('/api/rider/deliveries/7/proof', files={'file': ('proof.jpg', content, 'image/jpeg')}, headers=headers)
            self.assertEqual(result.status_code, 400, result.text)
        result = self.client.post('/api/rider/deliveries/7/proof', files={'file': ('proof.jpg', self.proof_image(), 'image/jpeg')}, headers=self.auth())
        self.assertEqual(result.status_code, 403)
        with self.factory() as db:
            delivery = db.get(self.scope['Delivery'], 7)
            delivery.rider_id = 2
            db.commit()
        result = self.client.post('/api/rider/deliveries/7/proof', files={'file': ('proof.jpg', self.proof_image(), 'image/jpeg')}, headers=headers)
        self.assertEqual(result.status_code, 403)
        with self.factory() as db:
            self.assertIsNone(db.get(self.scope['Delivery'], 7).proof_of_delivery_url)
            self.assertEqual(db.get(self.scope['Order'], 182).status, 'Picked Up')

    def test_valid_photo_completion_shares_private_evidence_and_notifies_both_parties_once(self):
        self.seed_active_delivery()
        rider_headers = self.auth('rider')
        with self.factory() as db:
            db.query(self.scope['OrderItem']).first().loyalty_points = 10
            db.commit()
        result = self.client.post('/api/rider/deliveries/7/proof', files={'file': ('photo.jpg', self.proof_image(), 'image/jpeg')}, headers=rider_headers)
        self.assertEqual(result.status_code, 200, result.text)
        proof_url = result.json()['proof_of_delivery_url']
        self.assertEqual(proof_url, '/api/deliveries/7/proof')
        customer_headers, clinic_headers = self.auth(), self.auth('business')
        for headers in [customer_headers, clinic_headers, rider_headers]:
            response = self.client.get(proof_url, headers=headers)
            self.assertEqual(response.status_code, 200, response.text if response.status_code != 200 else '')
            self.assertEqual(response.headers['content-type'], 'image/jpeg')
            self.assertEqual(response.headers['cache-control'], 'private, no-store')
        self.assertEqual(self.client.get(proof_url).status_code, 401)
        with self.factory() as db:
            db.add(self.scope['Customer'](id=2, email='other@example.test', role='customer', password_hash=pbkdf2_sha256.hash(self.password)))
            db.add(self.scope['BusinessProfile'](id=2, email='other-clinic@example.test', role='business', password_hash=pbkdf2_sha256.hash(self.password), compliance_status='verified'))
            db.commit()
        for role in ['customer', 'business']:
            token = self.scope['create_access_token']({'sub': '2', 'role': role})
            self.assertEqual(self.client.get(proof_url, headers={'Authorization': 'Bearer ' + token}).status_code, 403)
        # Both aliases use the same completion guard, and a retry cannot credit twice.
        for path in ['/api/rider/deliveries/7/status', '/api/rider/tasks/7/status']:
            result = self.client.patch(path, json={'new_status': 'Delivered'}, headers=rider_headers)
            self.assertEqual(result.status_code, 200, result.text)
        with self.factory() as db:
            self.assertEqual(db.get(self.scope['Order'], 182).status, 'Completed')
            self.assertEqual(db.query(self.scope['RiderWallet']).first().balance, 50)
            self.assertEqual(db.get(self.scope['Customer'], 1).loyalty_points, 0)
            notifications = db.query(self.scope['Notification']).all()
            self.assertEqual(len(notifications), 2)
            self.assertEqual(sum(n.customer_id == 1 for n in notifications), 1)
            self.assertEqual(sum(n.business_id == 1 for n in notifications), 1)
        customer = self.client.get('/api/orders', headers=customer_headers).json()['orders'][0]
        clinic = self.client.get('/api/business/orders', headers=clinic_headers).json()[0]
        self.assertEqual(customer['proof_of_delivery_url'], proof_url)
        self.assertEqual(clinic['proof_of_delivery_url'], proof_url)
        for new_status in ['pending_pickup', 'release', 'Picked Up']:
            self.assertEqual(self.client.patch('/api/rider/deliveries/7/status', json={'new_status': new_status}, headers=rider_headers).status_code, 400)
        # Completion freezes the proof so it cannot be swapped afterwards.
        self.assertEqual(self.client.post('/api/rider/deliveries/7/proof', files={'file': ('new.jpg', self.proof_image(), 'image/jpeg')}, headers=rider_headers).status_code, 400)

    def test_notification_dismissal_persists_and_does_not_remove_another_accounts_alert(self):
        with self.factory() as db:
            for row in [dict(id=1, customer_id=1), dict(id=2, customer_id=2), dict(id=3, business_id=1)]:
                db.add(self.scope['Notification'](**row, type='System', title='Test', description='Test'))
            db.commit()
        customer, clinic = self.auth(), self.auth('business')
        self.assertEqual(self.client.post('/api/notifications/read-all', headers=customer).status_code, 200)
        refreshed = self.client.get('/api/notifications', headers=customer).json()['notifications']
        self.assertTrue(refreshed[0]['read'])
        with self.factory() as db:
            self.assertFalse(db.get(self.scope['Notification'], 2).is_read)
            self.assertFalse(db.get(self.scope['Notification'], 3).is_read)
        result = self.client.delete('/api/notifications/1', headers=customer)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.client.get('/api/notifications', headers=customer).json()['notifications'], [])
        self.assertEqual(self.client.delete('/api/notifications/2', headers=customer).status_code, 404)
        self.assertEqual(self.client.post('/api/notifications/read-all', headers=clinic).status_code, 200)
        self.assertTrue(self.client.get('/api/notifications', headers=clinic).json()['notifications'][0]['read'])
        self.assertEqual(self.client.delete('/api/notifications/3', headers=clinic).status_code, 200)
        self.assertEqual(self.client.get('/api/notifications', headers=clinic).json()['notifications'], [])
        # Static /all must be matched before the dynamic /{n_id} route.
        self.assertEqual(self.client.delete('/api/notifications/all', headers=customer).status_code, 200)
        with self.factory() as db:
            self.assertIsNotNone(db.get(self.scope['Notification'], 2))

    def test_existing_order_reference_matches_across_all_roles_without_rekeying(self):
        self.seed_catalog()
        self.assertEqual(compact_order_references_in_text('Order HV-2026-000182-1183; HV-SN-182-1-1183'), 'Order HV-2026-1183; HV-SN-182-1-1183')
        created = datetime.fromtimestamp(1790801183)
        expected = f"HV-{created.year}-1183"
        with self.factory() as db:
            order = self.scope['Order'](id=182, customer_id=1, clinic_id=1,
                status='Processing', total_amount=100, fulfillment_method='delivery',
                payment_method='cash', created_at=created)
            db.add(order)
            db.add(self.scope['OrderItem'](order_id=182, product_id=1, product_name='Food',
                quantity=1, price=100, serial_number='HV-SN-182-1-1183'))
            db.commit()
            self.assertEqual(format_order_reference(order), expected)
        customer = self.client.get('/api/orders', headers=self.auth()).json()['orders'][0]
        clinic = self.client.get('/api/business/orders', headers=self.auth('business')).json()[0]
        rider = self.client.get('/api/rider/available-orders', headers=self.auth('rider')).json()['orders'][0]
        archive = self.client.get('/api/rider/orders/all', headers=self.auth('rider')).json()['orders'][0]
        self.assertEqual(customer['order_reference'], expected)
        self.assertEqual(clinic['id'], expected)
        self.assertEqual(rider['order_reference'], expected)
        self.assertEqual(archive['order_reference'], expected)
        self.assertEqual(customer['id'], 182)
        self.assertEqual(clinic['order_id'], 182)
        self.assertEqual(rider['id'], 182)
        with self.factory() as db:
            self.assertEqual(db.query(self.scope['Order']).count(), 1)
            self.assertEqual(db.query(self.scope['OrderItem']).first().serial_number, 'HV-SN-182-1-1183')

    def test_01_to_09_portal_matrix_and_no_session_for_rejections(self):
        for role in ('customer', 'business', 'rider'):
            for portal, expected_role in [('customer', 'customer'), ('clinic', 'business'), ('rider', 'rider')]:
                with self.subTest(account=role, portal=portal):
                    before = self.session_count()
                    result = self.login(role, portal)
                    self.assertEqual(result.status_code, 200 if role == expected_role else 401, result.text)
                    self.assertEqual(self.session_count(), before + int(role == expected_role))
                    if role != expected_role:
                        self.assertNotIn('token', result.json())

    def test_10_wrong_password_11_unknown_12_disabled_and_missing(self):
        self.assertEqual(self.login('customer', password='wrong').status_code, 401)
        self.assertEqual(self.client.post('/api/auth/login/customer', json={'email': 'unknown@example.test', 'password': self.password}).status_code, 401)
        self.assertEqual(self.client.post('/api/auth/login/customer', json={}).status_code, 400)
        for role in ('customer', 'business', 'rider'):
            with self.factory() as db:
                db.get(self.models[role], 1).is_deleted = True
                db.commit()
            self.assertEqual(self.login(role).status_code, 403)
        self.assertEqual(self.session_count(), 0)

    def test_13_unauthenticated_14_customer_rider_15_rider_clinic(self):
        self.assertEqual(self.client.get('/api/customer/qa-protected').status_code, 401)
        self.assertEqual(self.client.get('/api/rider/qa-protected', headers=self.auth()).status_code, 403)
        self.assertEqual(self.client.get('/api/business/qa-protected', headers=self.auth('rider')).status_code, 403)

    def test_16_logout_revokes_server_session_and_new_login_rotates_id(self):
        headers = self.auth()
        old = jwt.get_unverified_claims(headers['Authorization'][7:])
        self.assertEqual(self.client.get('/api/customer/qa-protected', headers=headers).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/logout', headers=headers).status_code, 200)
        self.assertEqual(self.client.get('/api/customer/qa-protected', headers=headers).status_code, 401)
        new_headers = self.auth()
        new = jwt.get_unverified_claims(new_headers['Authorization'][7:])
        self.assertNotEqual(old['sid'], new['sid'])

    def test_role_field_cannot_override_endpoint_or_database_role(self):
        self.assertEqual(self.login('rider', 'customer', extra={'role': 'customer'}).status_code, 401)
        with self.factory() as db:
            db.get(self.models['customer'], 1).role = 'unsupported'
            db.commit()
        self.assertEqual(self.login('customer').status_code, 401)
        self.assertEqual(self.session_count(), 0)

    def test_expiry_tamper_and_deactivation_block_existing_token(self):
        headers = self.auth()
        token = headers['Authorization'][7:]
        payload = jwt.get_unverified_claims(token)
        forged = jwt.encode({**payload, 'role': 'rider'}, 'isolated-qa-secret', algorithm='HS256')
        self.assertEqual(self.client.get('/api/rider/qa-protected', headers={'Authorization': 'Bearer ' + forged}).status_code, 401)
        with self.factory() as db:
            session = db.get(AuthSession, payload['sid'])
            session.expires_at = datetime.utcnow() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.client.get('/api/customer/qa-protected', headers=headers).status_code, 401)
        headers = self.auth()
        with self.factory() as db:
            db.get(self.models['customer'], 1).is_deleted = True
            db.commit()
        self.assertEqual(self.client.get('/api/customer/qa-protected', headers=headers).status_code, 401)

    def test_deactivation_preserves_customer_shipped_order_and_reservation(self):
        with self.factory() as db:
            db.add(self.scope['Order'](id=1, customer_id=1, status='Shipped', total_amount=100, fulfillment_method='delivery', payment_method='cod'))
            db.add(self.scope['Reservation'](id=1, customer_id=1, pet_name='Max', service='Check-up', date='2026-12-01', time='09:00 AM', status='Confirmed'))
            db.commit()
        headers = self.auth()
        self.assertEqual(self.client.delete('/api/account', headers=headers).status_code, 200)
        with self.factory() as db:
            self.assertTrue(db.get(self.models['customer'], 1).is_deleted)
            self.assertEqual(db.get(self.scope['Order'], 1).status, 'Shipped')
            self.assertEqual(db.get(self.scope['Reservation'], 1).status, 'Confirmed')
        self.assertEqual(self.client.get('/api/customer/qa-protected', headers=headers).status_code, 401)

    def test_admin_deactivation_has_no_permanent_delete_fallback(self):
        headers = self.auth('super_admin')
        system_headers = self.auth('system_admin')
        self.assertEqual(self.client.delete('/api/admin/users/SYS-001', headers=headers).status_code, 200)
        with self.factory() as db:
            self.assertIsNotNone(db.get(self.models['system_admin'], 1))
        self.assertEqual(self.client.get('/api/admin/users', headers=system_headers).status_code, 401)
        self.assertEqual(self.login('system_admin', 'admin').status_code, 403)

    def test_registration_names_and_catalog_validation(self):
        model = self.scope['RegisterRequest']
        base = dict(email='qa@example.test', password=self.password, otp='123456', first_name=' José ', middle_name='', last_name='Dela Cruz')
        self.assertEqual(model(**base).first_name, 'José')
        for field in ('first_name', 'middle_name', 'last_name'):
            for invalid in ('123', 'Juan2', 'A@B', "O'Neil", 'Jean-Luc'):
                with self.subTest(field=field, value=invalid), self.assertRaises(ValidationError):
                    model(**{**base, field: invalid})
        with self.assertRaises(ValidationError):
            model(**{**base, 'role': 'super_admin'})
        self.assertEqual(model(**{**base, 'role': 'clinic'}).role, 'business')
        create = self.scope['ProductCreate']
        update = self.scope['ProductUpdate']
        self.assertEqual(create(name=' Food ', price=0, stock=0, weight='2.4').name, 'Food')
        self.assertEqual(update(weight='0.25').weight, '0.25')
        for changes in ({'weight': 'words'}, {'weight': '2 kg'}, {'weight': '-1'}, {'price': -1}, {'price': float('inf')}, {'stock': -1}, {'stock': 1.5}, {'loyalty_points': -1}, {'sizes_json': '[{"name":"Small","stock":-1}]'}, {'inventory_distribution': {'1': {'price': -2, 'stock': 1}}}):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                update(**changes)

    def seed_catalog(self):
        with self.factory() as db:
            db.add(self.scope['Product'](id=1, business_id=1, name='Food', price=100, stock=10))
            db.add(self.scope['BusinessService'](id=1, business_id=1, name='Check-up', price=100, duration_minutes=30))
            for day in range(7):
                db.add(self.scope['BusinessOperatingHours'](business_id=1, day_of_week=day, is_open=True, open_time='09:00 AM', close_time='05:00 PM'))
            db.commit()

    def test_checkout_branches_load_only_product_sellers_without_full_clinic_directory(self):
        self.seed_catalog()
        with self.factory() as db:
            db.get(self.models['business'], 1).compliance_status = 'pending'
            db.get(self.models['business'], 1).clinic_name = 'Product Seller'
            db.add(self.scope['BusinessBranch'](id=1, business_id=1, name='Pickup Branch', phone='09171234567', street='Ruby Street', city='Caloocan', is_main=True))
            db.add(self.models['business'](id=2, email='other@example.test', password_hash='not-used', clinic_name='Unrelated Seller'))
            db.add(self.scope['BusinessBranch'](id=2, business_id=2, name='Unrelated Branch', phone='09171234568'))
            db.commit()
        response = self.client.get('/api/checkout/pickup-branches?product_ids=1,1')
        self.assertEqual(response.status_code, 200, response.text)
        clinics = response.json()['clinics']
        self.assertEqual([clinic['id'] for clinic in clinics], [1])
        self.assertEqual(clinics[0]['branches'][0]['name'], 'Pickup Branch')
        self.assertEqual(clinics[0]['branches'][0]['address_line1'], 'Ruby Street, Caloocan')
        with self.factory() as db:
            self.assertEqual(db.get(self.models['business'], 1).compliance_status, 'pending')
            db.get(self.scope['Product'], 1).is_archived = True
            db.commit()
        self.assertEqual(self.client.get('/api/checkout/pickup-branches?product_ids=1').json()['clinics'], [])
        self.assertEqual(self.client.get('/api/checkout/pickup-branches?product_ids=bad').status_code, 400)
        self.assertEqual(self.client.get('/api/checkout/pickup-branches?product_ids=-1').status_code, 400)

    def test_cash_order_sms_sent_once_after_saved_order(self):
        self.seed_catalog()
        result = self.client.post('/api/orders', headers=self.auth(), json={
            'items': [{'id': 1, 'name': 'Food', 'price': 100, 'quantity': 1}],
            'totalAmount': 150, 'fulfillmentMethod': 'delivery', 'paymentMethod': 'cod', 'clinic_id': 1,
        })
        self.assertEqual(result.status_code, 201, result.text)
        self.sms.assert_called_once()
        self.assertEqual(self.sms.call_args.args[0], '09171234567')
        self.assertIn('Order HV-', self.sms.call_args.args[1])
        self.assertNotIn('payment received', self.sms.call_args.args[1].lower())

    def test_sms_failure_does_not_fail_saved_reservation(self):
        self.seed_catalog()
        self.sms.side_effect = RuntimeError('simulated gateway outage')
        date = (datetime.utcnow() + timedelta(days=2)).strftime('%Y-%m-%d')
        result = self.client.post('/api/reservations', headers=self.auth(), json={
            'business_id': 1, 'service_id': 1, 'pet_name': 'Max', 'pet_type': 'Dog', 'service': 'Check-up',
            'date': date, 'time': '09:00 AM', 'total_amount': 100,
        })
        self.assertEqual(result.status_code, 200, result.text)
        self.sms.assert_called_once()
        self.assertIn(date, self.sms.call_args.args[1])
        self.assertIn('Payment Pending', self.sms.call_args.args[1])
        with self.factory() as db:
            self.assertEqual(db.query(self.scope['Reservation']).count(), 1)

    def test_online_orders_sms_for_hosted_and_qr_checkout_only_on_success(self):
        self.seed_catalog()
        headers = self.auth()
        def payment_api(request):
            if request.url.path.endswith('/checkout_sessions'):
                data = {'id': 'checkout-test', 'attributes': {'checkout_url': 'https://example.test/pay'}}
            elif request.url.path.endswith('/payment_intents'):
                data = {'id': 'intent-test', 'attributes': {'client_key': 'client-test'}}
            elif request.url.path.endswith('/payment_methods'):
                data = {'id': 'method-test'}
            else:
                data = {'id': 'attach-test', 'attributes': {'next_action': {'type': 'consume_qr', 'code': {'image_url': 'https://example.test/qr.png'}}}}
            return httpx.Response(200, json={'data': data})
        self.scope['httpx'] = SimpleNamespace(AsyncClient=lambda: httpx.AsyncClient(transport=httpx.MockTransport(payment_api)))
        body = {'items': [{'id': 1, 'name': 'Food', 'price': 100, 'quantity': 1}], 'totalAmount': 100,
                'fulfillmentMethod': 'pickup', 'clinic_id': 1}
        try:
            for method in ('gcash', 'qrph'):
                self.sms.reset_mock()
                response = self.client.post('/api/payments/paymongo/checkout', headers=headers, json={**body, 'paymentMethod': method})
                self.assertEqual(response.status_code, 200, response.text)
                self.sms.assert_called_once()
                self.assertIn('Payment Pending', self.sms.call_args.args[1])
            self.sms.reset_mock()
            self.scope['httpx'] = SimpleNamespace(AsyncClient=lambda: httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(500, json={}))))
            response = self.client.post('/api/payments/paymongo/checkout', headers=headers, json={**body, 'paymentMethod': 'gcash'})
            self.assertEqual(response.status_code, 500)
            self.sms.assert_not_called()
        finally:
            self.scope['httpx'] = httpx

    def test_pickup_order_and_invalid_reservation_sms(self):
        self.seed_catalog()
        headers = self.auth()
        response = self.client.post('/api/orders', headers=headers, json={
            'items': [{'id': 1, 'name': 'Food', 'price': 100, 'quantity': 1}], 'totalAmount': 100,
            'fulfillmentMethod': 'pickup', 'paymentMethod': 'cash', 'clinic_id': 1,
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.sms.assert_called_once()
        self.sms.reset_mock()
        response = self.client.post('/api/reservations', headers=headers, json={
            'business_id': 1, 'service_id': 1, 'pet_name': 'Max', 'service': 'Check-up',
            'date': '2000-01-01', 'time': '09:00 AM',
        })
        self.assertEqual(response.status_code, 400)
        self.sms.assert_not_called()


if __name__ == '__main__':
    unittest.main(verbosity=2)
