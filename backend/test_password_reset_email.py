import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from app.config import settings
from app.services.auth import ResendDeliveryError, send_password_reset_link


class PasswordResetEmailLoggingTests(unittest.TestCase):
    def _send_and_capture(self, token: str = "test-token") -> str:
        output = io.StringIO()
        with redirect_stdout(output):
            send_password_reset_link("user@example.com", token)
        return output.getvalue()

    def test_resend_success_logs_safe_delivery_details(self):
        with (
            patch.object(settings, "app_base_url", "https://doc-summ.vercel.app"),
            patch.object(settings, "resend_api_key", "secret-test-key"),
            patch.object(settings, "resend_from_email", "DocSumm <test@example.com>"),
            patch(
                "app.services.auth._send_password_reset_resend",
                return_value=(200, '{"id":"email_123"}'),
            ),
        ):
            output = self._send_and_capture()

        self.assertEqual(output.count("DOCSUMM EMAIL METHOD: RESEND"), 1)
        self.assertIn("DOCSUMM RESEND CONFIGURED: true", output)
        self.assertIn("DOCSUMM RESEND STATUS: 200", output)
        self.assertIn('DOCSUMM RESEND RESPONSE: {"id":"email_123"}', output)
        self.assertNotIn("DOCSUMM PASSWORD RESET LINK:", output)
        self.assertNotIn("secret-test-key", output)

    def test_resend_http_failure_logs_response_and_reset_link(self):
        captured = io.StringIO()
        with (
            patch.object(settings, "app_base_url", "https://doc-summ.vercel.app"),
            patch.object(settings, "resend_api_key", "secret-test-key"),
            patch.object(settings, "resend_from_email", "test@example.com"),
            patch(
                "app.services.auth._send_password_reset_resend",
                side_effect=ResendDeliveryError(422, '{"message":"invalid sender"}'),
            ),
            self.assertRaises(ResendDeliveryError),
            redirect_stdout(captured),
        ):
            send_password_reset_link("user@example.com", "failure-token")

        output = captured.getvalue()
        self.assertEqual(output.count("DOCSUMM EMAIL METHOD: RESEND"), 1)
        self.assertIn("DOCSUMM RESEND STATUS: 422", output)
        self.assertIn('DOCSUMM RESEND RESPONSE: {"message":"invalid sender"}', output)
        self.assertIn(
            "https://doc-summ.vercel.app/reset-password?token=failure-token",
            output,
        )
        self.assertNotIn("secret-test-key", output)

    def test_unexpected_resend_failure_logs_safe_fallback(self):
        captured = io.StringIO()
        with (
            patch.object(settings, "app_base_url", "https://doc-summ.vercel.app"),
            patch.object(settings, "resend_api_key", "secret-test-key"),
            patch.object(settings, "resend_from_email", "test@example.com"),
            patch(
                "app.services.auth._send_password_reset_resend",
                side_effect=OSError("network unavailable"),
            ),
            self.assertRaises(OSError),
            redirect_stdout(captured),
        ):
            send_password_reset_link("user@example.com", "network-failure-token")

        output = captured.getvalue()
        self.assertIn("DOCSUMM RESEND STATUS: 0", output)
        self.assertIn('DOCSUMM RESEND RESPONSE: {"error": "OSError"}', output)
        self.assertIn(
            "https://doc-summ.vercel.app/reset-password?token=network-failure-token",
            output,
        )
        self.assertNotIn("network unavailable", output)
        self.assertNotIn("secret-test-key", output)

    def test_missing_resend_config_uses_log_fallback(self):
        with (
            patch.object(settings, "app_base_url", "https://doc-summ.vercel.app/"),
            patch.object(settings, "resend_api_key", " "),
            patch.object(settings, "resend_from_email", "test@example.com"),
        ):
            output = self._send_and_capture("fallback-token")

        self.assertEqual(output.count("DOCSUMM EMAIL METHOD: LOG_FALLBACK"), 1)
        self.assertIn("DOCSUMM RESEND CONFIGURED: false", output)
        self.assertIn(
            "https://doc-summ.vercel.app/reset-password?token=fallback-token",
            output,
        )


if __name__ == "__main__":
    unittest.main()
