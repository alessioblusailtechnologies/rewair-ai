export interface ExtractedOrderLine {
  product_sku: string;
  product_name: string;
  quantity: number;
  due_date?: string;
}

export interface ExtractedOrder {
  customer_name: string;
  customer_code?: string;
  order_number?: string;
  order_date?: string;
  requested_delivery_date?: string;
  priority?: number;
  notes?: string;
  lines: ExtractedOrderLine[];
  confidence: number; // 0-1
  raw_summary: string;
}

export interface AIProviderConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  extractOrderFromText(
    text: string,
    context: { customers: { code: string; name: string }[]; products: { sku: string; name: string }[] },
    config?: AIProviderConfig,
  ): Promise<ExtractedOrder>;

  extractOrderFromImage(
    imageBase64: string,
    mimeType: string,
    context: { customers: { code: string; name: string }[]; products: { sku: string; name: string }[] },
    config?: AIProviderConfig,
  ): Promise<ExtractedOrder>;
}
