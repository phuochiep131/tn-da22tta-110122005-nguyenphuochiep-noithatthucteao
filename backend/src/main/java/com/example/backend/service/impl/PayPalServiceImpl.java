package com.example.backend.service.impl;

import com.example.backend.config.PayPalConfig;
import com.example.backend.service.PayPalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Triển khai PayPal Orders v2 bằng RestTemplate (cùng phong cách với VnPay/GHN trong dự án),
 * không phụ thuộc SDK nặng — chỉ gọi REST API trực tiếp.
 */
@Service
@RequiredArgsConstructor
public class PayPalServiceImpl implements PayPalService {

    private final PayPalConfig payPalConfig;
    private final RestTemplate restTemplate; // bean dùng chung đã có sẵn trong dự án

    /**
     * Lấy OAuth2 access token (client_credentials) để gọi các REST API của PayPal.
     */
    private String getAccessToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(payPalConfig.getClientId(), payPalConfig.getClientSecret());
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    payPalConfig.getBaseUrl() + "/v1/oauth2/token",
                    new HttpEntity<>(body, headers),
                    Map.class
            );
            Object token = resp.getBody() != null ? resp.getBody().get("access_token") : null;
            if (token == null) {
                throw new RuntimeException("PayPal không trả về access_token");
            }
            return token.toString();
        } catch (Exception e) {
            throw new RuntimeException("Không lấy được access token từ PayPal: " + e.getMessage(), e);
        }
    }

    /**
     * Quy đổi VND -> currency của PayPal (USD) và làm tròn 2 chữ số thập phân.
     */
    private String toPayPalAmount(BigDecimal amountVnd) {
        BigDecimal rate = payPalConfig.getVndToUsdRate();
        if (rate == null || rate.compareTo(BigDecimal.ZERO) <= 0) {
            rate = BigDecimal.valueOf(25000);
        }
        return amountVnd.divide(rate, 2, RoundingMode.HALF_UP).toPlainString();
    }

    @Override
    public Map<String, Object> createOrder(BigDecimal amountVnd) {
        String accessToken = getAccessToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Body theo chuẩn Orders v2: intent CAPTURE + 1 purchase_unit.
        Map<String, Object> amount = new HashMap<>();
        amount.put("currency_code", payPalConfig.getCurrency());
        amount.put("value", toPayPalAmount(amountVnd));

        Map<String, Object> purchaseUnit = new HashMap<>();
        purchaseUnit.put("amount", amount);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("intent", "CAPTURE");
        requestBody.put("purchase_units", List.of(purchaseUnit));

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders",
                    new HttpEntity<>(requestBody, headers),
                    Map.class
            );
            Map body = resp.getBody();
            Map<String, Object> result = new HashMap<>();
            result.put("id", body != null ? body.get("id") : null);
            result.put("status", body != null ? body.get("status") : null);
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo PayPal order: " + e.getMessage(), e);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> captureOrder(String paypalOrderId) {
        String accessToken = getAccessToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> result = new HashMap<>();
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    payPalConfig.getBaseUrl() + "/v2/checkout/orders/{id}/capture",
                    HttpMethod.POST,
                    new HttpEntity<>(headers),
                    Map.class,
                    paypalOrderId
            );

            Map body = resp.getBody();
            String status = body != null ? String.valueOf(body.get("status")) : "";
            boolean success = "COMPLETED".equalsIgnoreCase(status);

            result.put("success", success);
            result.put("status", status);
            result.put("transactionId", extractCaptureId(body));
            return result;
        } catch (Exception e) {
            result.put("success", false);
            result.put("status", "ERROR");
            result.put("message", "Lỗi capture PayPal: " + e.getMessage());
            return result;
        }
    }

    /**
     * Bóc mã giao dịch capture từ response:
     * purchase_units[0].payments.captures[0].id
     */
    @SuppressWarnings("unchecked")
    private String extractCaptureId(Map body) {
        try {
            List<Map> units = (List<Map>) body.get("purchase_units");
            Map payments = (Map) units.get(0).get("payments");
            List<Map> captures = (List<Map>) payments.get("captures");
            return String.valueOf(captures.get(0).get("id"));
        } catch (Exception ignored) {
            // Nếu cấu trúc không như mong đợi thì fallback về chính order id (xử lý ở FE).
            return null;
        }
    }
}
