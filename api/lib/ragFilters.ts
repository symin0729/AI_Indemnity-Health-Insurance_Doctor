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

export const isVerifiedRagMetadata = (metadata: Record<string, unknown>): boolean =>
  firstValue(metadata, "status", "reviewStatus", "review_status")?.toUpperCase() === "VERIFIED";

export const matchesRagFilters = (
  metadata: Record<string, unknown>,
  filters: RagFilters,
): boolean => {
  if (firstValue(metadata, "productCode", "product_code") !== filters.productCode) return false;
  if (filters.generation !== undefined && value(metadata, "generation") !== String(filters.generation)) return false;
  if (filters.coverageCode !== undefined && firstValue(metadata, "coverageCode", "coverage_code") !== filters.coverageCode) return false;
  return true;
};
