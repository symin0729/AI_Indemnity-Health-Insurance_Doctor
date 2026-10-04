export interface RagFilters {
  productCode: string;
  generation?: number;
  coverageCode?: string;
}

const value = (metadata: Record<string, unknown>, key: string): string | undefined => {
  const candidate = metadata[key];
  return typeof candidate === "string" || typeof candidate === "number"
    ? String(candidate)
    : undefined;
};

const firstValue = (metadata: Record<string, unknown>, ...keys: string[]): string | undefined =>
  keys.map((key) => value(metadata, key)).find((candidate) => candidate !== undefined);

export const ragStatusOf = (metadata: Record<string, unknown>): string | undefined =>
  firstValue(metadata, "status", "reviewStatus", "review_status")?.toUpperCase();

export const isVerifiedRagMetadata = (metadata: Record<string, unknown>): boolean =>
  ragStatusOf(metadata) === "VERIFIED";

/** 허용 상태 목록(기본 VERIFIED 만)에 들어 있는 문서만 통과시킨다. 상태가 없으면 항상 차단한다. */
export const isAllowedRagStatus = (
  metadata: Record<string, unknown>,
  allowedStatuses: readonly string[] = ["VERIFIED"],
): boolean => {
  const status = ragStatusOf(metadata);
  return status !== undefined && allowedStatuses.map((item) => item.toUpperCase()).includes(status);
};

export const matchesRagFilters = (
  metadata: Record<string, unknown>,
  filters: RagFilters,
): boolean => {
  if (firstValue(metadata, "productCode", "product_code") !== filters.productCode) return false;
  if (filters.generation !== undefined && value(metadata, "generation") !== String(filters.generation)) return false;
  if (filters.coverageCode !== undefined && firstValue(metadata, "coverageCode", "coverage_code") !== filters.coverageCode) return false;
  return true;
};
