package com.example.backend.service.impl;

import com.example.backend.DTO.ghn.GhnDistrictDTO;
import com.example.backend.DTO.ghn.GhnFeeRequest;
import com.example.backend.DTO.ghn.GhnFeeResponse;
import com.example.backend.DTO.ghn.GhnProvinceDTO;
import com.example.backend.DTO.ghn.GhnServiceDTO;
import com.example.backend.DTO.ghn.GhnWardDTO;
import com.example.backend.DTO.ghn.ShippingFeeRequest;
import com.example.backend.DTO.ghn.ShippingFeeResponse;
import com.example.backend.config.GhnProperties;
import com.example.backend.exception.GhnApiException;
import com.example.backend.model.OrderDetail;
import com.example.backend.model.Product;
import com.example.backend.repository.ProductRepository;
import com.example.backend.service.GhnService;
import com.example.backend.util.ShippingCalculator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Supplier;

@Service
public class GhnServiceImpl implements GhnService {

    private static final Logger log = LoggerFactory.getLogger(GhnServiceImpl.class);
    private static final Duration LOCATION_CACHE_TTL = Duration.ofHours(12);

    private final RestTemplate restTemplate;
    private final GhnProperties properties;
    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentMap<String, CacheEntry<?>> locationCache = new ConcurrentHashMap<>();

    public GhnServiceImpl(
            RestTemplate restTemplate,
            GhnProperties properties,
            ProductRepository productRepository
    ) {
        this.restTemplate = restTemplate;
        this.properties = properties;
        this.productRepository = productRepository;
    }

    @Override
    public List<GhnProvinceDTO> getProvinces() {
        return getCachedList("provinces", () -> {
            JsonNode data = callGhn("/master-data/province", HttpMethod.GET, null, false, "getProvinces");
            List<GhnProvinceDTO> provinces = new ArrayList<>();
            if (data != null && data.isArray()) {
                data.forEach(item -> provinces.add(new GhnProvinceDTO(
                        intValue(item, "ProvinceID"),
                        textValue(item, "ProvinceName"),
                        textValue(item, "Code")
                )));
            }
            log.info("GHN loaded {} provinces", provinces.size());
            return provinces;
        });
    }

    @Override
    public List<GhnDistrictDTO> getDistricts(Integer provinceId) {
        validatePositive(provinceId, "provinceId");
        return getCachedList("districts:" + provinceId, () -> {
            JsonNode data = callGhn(
                    "/master-data/district",
                    HttpMethod.POST,
                    Map.of("province_id", provinceId),
                    false,
                    "getDistricts"
            );
            List<GhnDistrictDTO> districts = new ArrayList<>();
            if (data != null && data.isArray()) {
                data.forEach(item -> districts.add(new GhnDistrictDTO(
                        intValue(item, "DistrictID"),
                        intValue(item, "ProvinceID"),
                        textValue(item, "DistrictName"),
                        textValue(item, "Code")
                )));
            }
            log.info("GHN loaded {} districts for province {}", districts.size(), provinceId);
            return districts;
        });
    }

    @Override
    public List<GhnWardDTO> getWards(Integer districtId) {
        validatePositive(districtId, "districtId");
        return getCachedList("wards:" + districtId, () -> {
            JsonNode data = callGhn(
                    "/master-data/ward",
                    HttpMethod.POST,
                    Map.of("district_id", districtId),
                    false,
                    "getWards"
            );
            List<GhnWardDTO> wards = new ArrayList<>();
            if (data != null && data.isArray()) {
                data.forEach(item -> wards.add(new GhnWardDTO(
                        textValue(item, "WardCode"),
                        intValue(item, "DistrictID"),
                        textValue(item, "WardName")
                )));
            }
            log.info("GHN loaded {} wards for district {}", wards.size(), districtId);
            return wards;
        });
    }

    @Override
    public List<GhnServiceDTO> getAvailableServices(Integer toDistrictId) {
        validatePositive(toDistrictId, "toDistrictId");
        validateConfigured();

        String cacheKey = "services:" + properties.getFromDistrictId() + ":" + toDistrictId;
        return getCachedList(cacheKey, () -> {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("shop_id", properties.getShopId());
            payload.put("from_district", properties.getFromDistrictId());
            payload.put("to_district", toDistrictId);

            JsonNode data = callGhn(
                    "/v2/shipping-order/available-services",
                    HttpMethod.POST,
                    payload,
                    false,
                    "getAvailableServices"
            );

            List<GhnServiceDTO> services = new ArrayList<>();
            if (data != null && data.isArray()) {
                data.forEach(item -> services.add(new GhnServiceDTO(
                        intValue(item, "service_id"),
                        intValue(item, "service_type_id"),
                        textValue(item, "short_name")
                )));
            }

            log.info(
                    "GHN loaded {} services from district {} to district {}",
                    services.size(),
                    properties.getFromDistrictId(),
                    toDistrictId
            );
            return services;
        });
    }

    @Override
    public GhnFeeResponse calculateShippingFee(GhnFeeRequest request) {
        validatePositive(request.getToDistrictId(), "toDistrictId");
        if (!StringUtils.hasText(request.getToWardCode())) {
            throw new IllegalArgumentException("toWardCode is required");
        }
        validateConfigured();

        Integer serviceId = request.getServiceId();
        if (serviceId == null || serviceId <= 0) {
            serviceId = getAvailableServices(request.getToDistrictId()).stream()
                    .map(GhnServiceDTO::getServiceId)
                    .filter(Objects::nonNull)
                    .filter(id -> id > 0)
                    .findFirst()
                    .orElseThrow(() -> new GhnApiException("GHN has no available service for this route"));
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from_district_id", properties.getFromDistrictId());
        payload.put("to_district_id", request.getToDistrictId());
        payload.put("to_ward_code", request.getToWardCode());
        payload.put("service_id", serviceId);
        payload.put("height", positiveOrDefault(request.getHeight(), properties.getDefaultHeight()));
        payload.put("length", positiveOrDefault(request.getLength(), properties.getDefaultLength()));
        payload.put("weight", positiveOrDefault(request.getWeight(), properties.getDefaultWeight()));
        payload.put("width", positiveOrDefault(request.getWidth(), properties.getDefaultWidth()));
        payload.put("insurance_value", nonNegativeOrDefault(
                request.getInsuranceValue(),
                properties.getDefaultInsuranceValue()
        ));

        log.info(
                "GHN fee request: fromDistrict={}, toDistrict={}, ward={}, serviceId={}, weight={}",
                properties.getFromDistrictId(),
                request.getToDistrictId(),
                request.getToWardCode(),
                serviceId,
                payload.get("weight")
        );

        JsonNode data = callGhn(
                "/v2/shipping-order/fee",
                HttpMethod.POST,
                payload,
                true,
                "calculateShippingFee"
        );

        GhnFeeResponse response = new GhnFeeResponse(
                serviceId,
                intValue(data, "total"),
                intValue(data, "service_fee"),
                intValue(data, "insurance_fee"),
                intValue(data, "pick_station_fee"),
                intValue(data, "coupon_value"),
                intValue(data, "r2s_fee"),
                intValue(data, "return_fee")
        );

        if (response.getTotalFee() == null) {
            throw new GhnApiException("GHN fee response does not include total fee");
        }

        log.info("GHN fee response: serviceId={}, totalFee={}", serviceId, response.getTotalFee());
        return response;
    }

    @Override
    public ShippingFeeResponse calculateShippingFee(ShippingFeeRequest request) {
        validatePositive(request.getToDistrictId(), "toDistrictId");
        if (!StringUtils.hasText(request.getToWardCode())) {
            throw new IllegalArgumentException("toWardCode is required");
        }
        validateConfigured();

        // 1. Check free shipping rule
        boolean free = ShippingCalculator.isFreeShipping(request.getSubtotal());
        ShippingFeeResponse response = new ShippingFeeResponse();

        if (free) {
            response.setServiceId(request.getServiceId());
            response.setTotalFee(0);
            response.setServiceFee(0);
            response.setInsuranceFee(0);
            response.setFreeShipping(true);
            response.setFreeShippingReason("Đơn hàng từ 15,000,000đ được miễn phí vận chuyển");
            return response;
        }

        // 2. Fetch product dimensions and map to order details
        List<OrderDetail> tempOrderDetails = new ArrayList<>();
        if (request.getItems() != null) {
            for (ShippingFeeRequest.CartItem cartItem : request.getItems()) {
                OrderDetail detail = new OrderDetail();
                detail.setQuantity(cartItem.getQuantity());

                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product != null) {
                    detail.setProduct(product);
                } else {
                    Product dummy = new Product();
                    dummy.setProductId(cartItem.getProductId());
                    detail.setProduct(dummy);
                }
                tempOrderDetails.add(detail);
            }
        }

        // 3. Aggregate dimensions
        ShippingCalculator.PackageSpec spec = ShippingCalculator.calculate(tempOrderDetails, properties);

        // 4. Delegate to the standard GHN call
        GhnFeeRequest ghnRequest = new GhnFeeRequest();
        ghnRequest.setToDistrictId(request.getToDistrictId());
        ghnRequest.setToWardCode(request.getToWardCode());
        ghnRequest.setServiceId(request.getServiceId());
        ghnRequest.setLength(spec.length());
        ghnRequest.setWidth(spec.width());
        ghnRequest.setHeight(spec.height());
        ghnRequest.setWeight(spec.weight());
        ghnRequest.setInsuranceValue(request.getInsuranceValue());

        GhnFeeResponse ghnFeeResponse = calculateShippingFee(ghnRequest);

        response.setServiceId(ghnFeeResponse.getServiceId());
        response.setTotalFee(ghnFeeResponse.getTotalFee());
        response.setServiceFee(ghnFeeResponse.getServiceFee());
        response.setInsuranceFee(ghnFeeResponse.getInsuranceFee());
        response.setFreeShipping(false);
        response.setFreeShippingReason("");
        return response;
    }

    private JsonNode callGhn(
            String path,
            HttpMethod method,
            Map<String, Object> payload,
            boolean includeShopIdHeader,
            String operation
    ) {
        validateToken();

        return withRetry(operation, () -> {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Token", properties.getToken());
            if (includeShopIdHeader) {
                headers.set("ShopId", String.valueOf(properties.getShopId()));
            }

            HttpEntity<Map<String, Object>> entity = payload == null
                    ? new HttpEntity<>(headers)
                    : new HttpEntity<>(payload, headers);

            try {
                ResponseEntity<JsonNode> response = restTemplate.exchange(
                        buildUrl(path),
                        method,
                        entity,
                        JsonNode.class
                );

                JsonNode root = response.getBody();
                if (root == null) {
                    throw new GhnApiException("GHN returned empty response");
                }

                int code = root.path("code").asInt(response.getStatusCode().value());
                String message = root.path("message").asText("GHN request failed");
                if (!response.getStatusCode().is2xxSuccessful() || code != 200) {
                    log.warn("GHN {} failed: httpStatus={}, code={}, message={}",
                            operation,
                            response.getStatusCode().value(),
                            code,
                            message);
                    throw new GhnApiException(message);
                }

                return root.path("data");
            } catch (HttpStatusCodeException ex) {
                // GHN trả lỗi nghiệp vụ (4xx/5xx) KÈM message thật trong body.
                // RestTemplate ném exception trước khi đọc body, nên ta tự bóc message ở đây
                // thay vì báo "Cannot connect" gây hiểu lầm.
                String ghnMessage = extractGhnErrorMessage(ex.getResponseBodyAsString());
                log.warn("GHN {} business error: httpStatus={}, message={}",
                        operation, ex.getStatusCode().value(), ghnMessage);
                throw new GhnApiException(ghnMessage);
            } catch (RestClientException ex) {
                // Đây mới thực sự là lỗi kết nối (timeout, DNS, mất mạng...).
                log.warn("GHN {} transport error: {}", operation, ex.getMessage());
                throw new GhnApiException("Cannot connect to GHN API", ex);
            }
        });
    }

    /**
     * Bóc field "message" trong body lỗi của GHN; nếu không parse được thì trả message gốc.
     */
    private String extractGhnErrorMessage(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            return "GHN request failed";
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            String message = node.path("message").asText(null);
            if (StringUtils.hasText(message)) {
                return message;
            }
        } catch (Exception ignored) {
            // body không phải JSON hợp lệ -> dùng nguyên văn bên dưới
        }
        return responseBody;
    }

    private <T> T withRetry(String operation, Supplier<T> supplier) {
        RuntimeException lastError = null;
        int attempts = Math.max(1, properties.getRetryAttempts() == null ? 1 : properties.getRetryAttempts());

        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                return supplier.get();
            } catch (RuntimeException ex) {
                lastError = ex;
                if (attempt >= attempts) {
                    break;
                }
                log.warn("GHN {} failed on attempt {}/{}. Retrying...", operation, attempt, attempts);
                try {
                    Thread.sleep(250L * attempt);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new GhnApiException("GHN retry interrupted", interrupted);
                }
            }
        }

        throw lastError;
    }

    @SuppressWarnings("unchecked")
    private <T> List<T> getCachedList(String key, Supplier<List<T>> supplier) {
        CacheEntry<?> cached = locationCache.get(key);
        if (cached != null && !cached.isExpired()) {
            return (List<T>) cached.value();
        }

        List<T> value = supplier.get();
        locationCache.put(key, new CacheEntry<>(value, Instant.now().plus(LOCATION_CACHE_TTL)));
        return value;
    }

    private String buildUrl(String path) {
        String baseUrl = StringUtils.hasText(properties.getBaseUrl())
                ? properties.getBaseUrl().trim()
                : "https://online-gateway.ghn.vn/shiip/public-api";
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl + path;
    }

    private void validateConfigured() {
        validateToken();
        validatePositive(properties.getShopId(), "GHN shopId");
        validatePositive(properties.getFromDistrictId(), "GHN fromDistrictId");
    }

    private void validateToken() {
        if (!StringUtils.hasText(properties.getToken())) {
            throw new GhnApiException("GHN token is not configured");
        }
    }

    private void validatePositive(Integer value, String fieldName) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than 0");
        }
    }

    private int positiveOrDefault(Integer value, Integer fallback) {
        if (value != null && value > 0) {
            return value;
        }
        return fallback != null && fallback > 0 ? fallback : 1;
    }

    private int nonNegativeOrDefault(Integer value, Integer fallback) {
        if (value != null && value >= 0) {
            return value;
        }
        return fallback != null && fallback >= 0 ? fallback : 0;
    }

    private Integer intValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.get(fieldName) == null || node.get(fieldName).isNull()) {
            return null;
        }
        return node.get(fieldName).asInt();
    }

    private String textValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.get(fieldName) == null || node.get(fieldName).isNull()) {
            return null;
        }
        return node.get(fieldName).asText();
    }

    private record CacheEntry<T>(T value, Instant expiresAt) {
        private boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
