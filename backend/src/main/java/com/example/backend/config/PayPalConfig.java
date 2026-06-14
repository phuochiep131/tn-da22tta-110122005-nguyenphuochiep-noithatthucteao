package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Cấu hình PayPal (đọc từ application.properties / .env).
 *
 * Mặc định trỏ tới môi trường SANDBOX. Khi go-live đổi {@code paypal.base-url}
 * thành https://api-m.paypal.com và dùng credential Live.
 *
 * LƯU Ý: Cửa hàng định giá bằng VND nhưng PayPal KHÔNG hỗ trợ VND, nên số tiền
 * sẽ được quy đổi VND -> {@code paypal.currency} (mặc định USD) theo tỉ giá
 * {@code paypal.vnd-to-usd-rate}.
 */
@Component
public class PayPalConfig {

    @Value("${paypal.client-id:}")
    private String clientId;

    @Value("${paypal.client-secret:}")
    private String clientSecret;

    @Value("${paypal.base-url:https://api-m.sandbox.paypal.com}")
    private String baseUrl;

    @Value("${paypal.currency:USD}")
    private String currency;

    /** Số VND tương ứng 1 đơn vị tiền PayPal (USD). Ví dụ 25000 nghĩa là 25.000đ = 1 USD. */
    @Value("${paypal.vnd-to-usd-rate:25000}")
    private BigDecimal vndToUsdRate;

    public String getClientId() { return clientId; }
    public String getClientSecret() { return clientSecret; }
    public String getBaseUrl() { return baseUrl; }
    public String getCurrency() { return currency; }
    public BigDecimal getVndToUsdRate() { return vndToUsdRate; }
}
