"""Revocable sessions for the existing JWT authentication flow."""
from datetime import datetime, timedelta
import secrets

from jose import jwt, JWTError
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.orm import declarative_base

SessionBase = declarative_base()


class AuthSession(SessionBase):
    __tablename__ = 'auth_sessions'
    id = Column(String(64), primary_key=True)
    account_id = Column(Integer, nullable=False)
    role = Column(String(32), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)


class AccountAccessLock(SessionBase):
    # Administrators have no is_deleted column. This preserves their records too.
    __tablename__ = 'account_access_locks'
    role = Column(String(32), primary_key=True)
    account_id = Column(Integer, primary_key=True)
    disabled_at = Column(DateTime, nullable=False, default=datetime.utcnow)


def canonical_role(role):
    return {'user': 'customer', 'customer': 'customer', 'clinic': 'business',
            'business': 'business', 'rider': 'rider', 'admin': 'super_admin',
            'super_admin': 'super_admin', 'system_admin': 'system_admin'}.get(role)


def account_disabled(db, account, role):
    return bool(getattr(account, 'is_deleted', False)
                or getattr(account, 'compliance_status', '') == 'suspended'
                or db.get(AccountAccessLock, (role, account.id)))


def issue_session(factory, data, secret, algorithm, days):
    payload = data.copy()
    role = canonical_role(payload.get('role'))
    if not role:
        raise JWTError('Unsupported account role')
    expires = datetime.utcnow() + timedelta(days=days)
    sid = payload.get('sid')
    with factory() as db:
        if sid:
            session = db.get(AuthSession, sid)
            if not session or session.revoked or session.role != role or str(session.account_id) != payload['sub'] or session.expires_at <= datetime.utcnow():
                raise JWTError('Your session has expired. Please log in again.')
            expires = session.expires_at
        else:
            sid = secrets.token_urlsafe(32)
            db.add(AuthSession(id=sid, account_id=int(payload['sub']), role=role, expires_at=expires))
            db.commit()
    payload.update(role=role, sid=sid, exp=expires)
    return jwt.encode(payload, secret, algorithm=algorithm)


def read_session(factory, token, secret, algorithm, models):
    payload = jwt.decode(token, secret, algorithms=[algorithm])
    role = canonical_role(payload.get('role'))
    sid = payload.get('sid')
    if not role or not sid:
        raise JWTError('Your session has expired. Please log in again.')
    with factory() as db:
        session = db.get(AuthSession, sid)
        if (not session or session.revoked or session.expires_at <= datetime.utcnow()
                or session.role != role or str(session.account_id) != payload.get('sub')):
            raise JWTError('Your session has expired. Please log in again.')
        account = db.get(models[role], session.account_id)
        if (not account or canonical_role(getattr(account, 'role', None)) != role
                or account_disabled(db, account, role)):
            raise JWTError('Your account is inactive. Please contact support.')
    payload['role'] = role
    return payload


def permitted_roles(path, method):
    """Shared profile routes intentionally serve all existing account roles."""
    if path.startswith('/api/admin/'):
        return {'super_admin', 'system_admin'}
    if path == '/api/business/upload-document':
        return None  # Existing pre-registration compliance upload.
    if path == '/api/business/upload-product-image':
        return {'business', 'customer'}  # Shared by catalog editing and purchased-product reviews.
    if path.startswith('/api/business/'):
        return {'business'}
    if path.startswith('/api/rider/'):
        return {'rider'}
    if path in {'/api/customer/profile', '/api/customer/password'}:
        return {'customer', 'business', 'rider', 'super_admin', 'system_admin'}
    if path.startswith('/api/orders/') and '/refund-photo/' in path and method == 'GET':
        return {'customer', 'business'}
    if path.startswith(('/api/customer/', '/api/customers/', '/api/orders', '/api/loyalty', '/api/payments/paymongo/')):
        return {'customer'}
    if path == '/api/reservations/booked' and method == 'GET':
        return None
    if path.startswith('/api/reservations'):
        if path.endswith('/status'):
            return {'business'}
        if method == 'GET':
            return {'customer', 'business'}
        return {'customer'}
    if path.startswith('/api/deliveries/') and path.endswith('/proof'):
        return {'customer', 'business', 'rider'}
    if path == '/api/deliveries/broadcast':
        return {'business'}
    if path.startswith('/api/catalog/') and method == 'POST':
        return {'customer'}
    if path.startswith('/api/notifications') or path == '/api/account' or path == '/api/auth/me' or path in {'/api/auth/request-email-change', '/api/auth/verify-email-change'}:
        return {'customer', 'business', 'rider', 'super_admin', 'system_admin'}
    return None
