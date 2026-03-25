"""Tests for sales service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.pos.sales_service import (
    SalesService,
    PAYMENT_TOLERANCE,
    PAYMENT_EXACT_TOLERANCE,
)


class TestNormalizeDocumentType:
    """Tests for document type normalization."""

    @pytest.mark.parametrize(
        "input_type,expected",
        [
            ("TICKET", "TICKET"),
            ("ticket", "TICKET"),
            ("BOLETA", "BOLETA"),
            ("boleta", "BOLETA"),
            ("FACTURA", "FACTURA"),
            ("factura", "FACTURA"),
            (None, "TICKET"),
            ("", "TICKET"),
        ],
    )
    def test_normalize_document_type_valid(self, input_type, expected):
        """Test valid document types are normalized correctly."""
        from fastapi import HTTPException

        result = SalesService._normalize_document_type(input_type)
        assert result == expected

    def test_normalize_document_type_invalid(self):
        """Test invalid document type raises error."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            SalesService._normalize_document_type("INVALID")
        assert exc_info.value.status_code == 422
        assert "invalido" in exc_info.value.detail


class TestValidateCustomerForDocument:
    """Tests for customer document validation."""

    def test_ticket_no_customer_required(self):
        """Test that TICKET doesn't require customer."""
        mock_customer = MagicMock()
        SalesService._validate_customer_for_document("TICKET", mock_customer)

    def test_boleta_requires_customer_name(self):
        """Test that BOLETA requires customer with name."""
        from fastapi import HTTPException

        mock_customer = MagicMock()
        mock_customer.name = None
        with pytest.raises(HTTPException) as exc_info:
            SalesService._validate_customer_for_document("BOLETA", mock_customer)
        assert "nombre" in exc_info.value.detail

    def test_factura_requires_tax_id(self):
        """Test that FACTURA requires customer with RUC."""
        from fastapi import HTTPException

        mock_customer = MagicMock()
        mock_customer.name = "Test"
        mock_customer.tax_id = None
        with pytest.raises(HTTPException) as exc_info:
            SalesService._validate_customer_for_document("FACTURA", mock_customer)
        assert "RUC" in exc_info.value.detail

    def test_factura_valid_customer(self):
        """Test valid FACTURA customer passes validation."""
        mock_customer = MagicMock()
        mock_customer.name = "Test"
        mock_customer.tax_id = "12345678901"
        SalesService._validate_customer_for_document("FACTURA", mock_customer)


class TestCalculateTotals:
    """Tests for total calculations."""

    def test_calculate_totals_tax_excluded(self):
        """Test totals calculation with tax excluded."""
        service = SalesService(None, None)
        subtotal, tax, total = service._calculate_totals(
            base_total=100.0, global_discount=10.0, tax_included=False, tax_rate=18.0
        )
        assert subtotal == 100.0
        assert tax == 18.0
        assert total == 108.0

    def test_calculate_totals_tax_included(self):
        """Test totals calculation with tax included."""
        service = SalesService(None, None)
        subtotal, tax, total = service._calculate_totals(
            base_total=118.0, global_discount=10.0, tax_included=True, tax_rate=18.0
        )
        assert tax == 18.0
        assert subtotal == 100.0
        assert total == 108.0

    def test_calculate_totals_zero_tax(self):
        """Test totals with zero tax rate."""
        service = SalesService(None, None)
        subtotal, tax, total = service._calculate_totals(
            base_total=100.0, global_discount=5.0, tax_included=False, tax_rate=0.0
        )
        assert tax == 0.0
        assert total == 95.0

    def test_calculate_totals_discount_exceeds_total(self):
        """Test that discount is capped at total."""
        service = SalesService(None, None)
        subtotal, tax, total = service._calculate_totals(
            base_total=100.0, global_discount=150.0, tax_included=False, tax_rate=0.0
        )
        assert total == 0.0


class TestCalculateLoyaltyEarned:
    """Tests for loyalty points calculation."""

    @pytest.mark.parametrize(
        "total,expected_points",
        [
            (100.0, 100),
            (50.5, 50),
            (0.0, 0),
            (0.99, 0),
            (150.50, 150),
        ],
    )
    def test_calculate_loyalty_earned(self, total, expected_points):
        """Test loyalty points calculation based on total."""
        points = SalesService._calculate_loyalty_earned(total)
        assert points == expected_points


class TestValidatePayments:
    """Tests for payment validation."""

    def test_validate_payments_valid_cash(self):
        """Test valid cash payment passes."""
        service = SalesService(None, None)
        from app.schemas.sale import PaymentCreate

        payments = [PaymentCreate(method="CASH", amount=100.0)]
        result = service._validate_payments(payments, 100.0)
        assert result == [("CASH", 100.0)]

    def test_validate_payments_exact_match(self):
        """Test exact payment match."""
        service = SalesService(None, None)
        from app.schemas.sale import PaymentCreate

        payments = [PaymentCreate(method="CARD", amount=50.0)]
        result = service._validate_payments(payments, 50.0)
        assert result == [("CARD", 50.0)]

    def test_validate_payments_with_tolerance(self):
        """Test payment with small overpayment tolerance."""
        service = SalesService(None, None)
        from app.schemas.sale import PaymentCreate

        payments = [PaymentCreate(method="CASH", amount=100.01)]
        result = service._validate_payments(payments, 100.0)
        assert result == [("CASH", 100.01)]

    def test_validate_payments_insufficient(self):
        """Test insufficient payment raises error."""
        from fastapi import HTTPException

        service = SalesService(None, None)
        from app.schemas.sale import PaymentCreate

        payments = [PaymentCreate(method="CASH", amount=50.0)]
        with pytest.raises(HTTPException) as exc_info:
            service._validate_payments(payments, 100.0)
        assert exc_info.value.status_code == 409
        assert "insuficiente" in exc_info.value.detail

    def test_validate_payments_non_cash_exact_required(self):
        """Test non-cash payments require exact amount."""
        from fastapi import HTTPException

        service = SalesService(None, None)
        from app.schemas.sale import PaymentCreate

        payments = [PaymentCreate(method="CARD", amount=100.5)]
        with pytest.raises(HTTPException) as exc_info:
            service._validate_payments(payments, 100.0)
        assert exc_info.value.status_code == 409
        assert "no coincide" in exc_info.value.detail


class TestPaymentConstants:
    """Tests for payment-related constants."""

    def test_payment_tolerance_value(self):
        """Test payment tolerance is correctly set."""
        from decimal import Decimal

        assert PAYMENT_TOLERANCE == Decimal("1e-6")

    def test_payment_exact_tolerance_value(self):
        """Test exact payment tolerance is correctly set."""
        from decimal import Decimal

        assert PAYMENT_EXACT_TOLERANCE == Decimal("0.01")
