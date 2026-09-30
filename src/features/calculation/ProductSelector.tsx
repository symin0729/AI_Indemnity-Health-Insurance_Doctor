import type { InsuranceProduct } from "../../domain/product";

interface ProductSelectorProps {
  products: InsuranceProduct[];
  value: string;
  onChange: (productCode: string) => void;
}

export function ProductSelector({ products, value, onChange }: ProductSelectorProps) {
  return (
    <label>
      비교 상품
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">상품을 선택해주세요</option>
        {products.map((product) => (
          <option key={product.productCode} value={product.productCode} disabled={product.reviewStatus !== "VERIFIED"}>
            {product.displayName} · {product.reviewStatus}
          </option>
        ))}
      </select>
    </label>
  );
}
