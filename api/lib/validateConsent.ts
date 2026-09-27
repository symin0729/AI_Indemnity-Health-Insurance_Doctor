export class ConsentValidationError extends Error {
  readonly code = "CONSENT_REQUIRED";
}

export const validateConsent = (
  input: { consentGranted: boolean; consentPolicyVersion: string },
  expectedVersion: string,
): void => {
  if (!input.consentGranted || input.consentPolicyVersion !== expectedVersion) {
    throw new ConsentValidationError(
      "외부 AI 이용 동의와 최신 동의 정책 확인이 필요합니다.",
    );
  }
};
